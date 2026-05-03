/**
 * Companies House Lookup Lambda
 *
 * Reads sponsors with fingerprintStatus="pending" from Typesense,
 * looks up each company via the Companies House API to find their website URL,
 * updates Typesense, and sends SQS messages for sponsors with websites found.
 *
 * Env vars (or pulled from AWS Secrets Manager if not set):
 *   TYPESENSE_HOST, TYPESENSE_ADMIN_KEY
 *   COMPANIES_HOUSE_API_KEY
 *   SQS_QUEUE_URL   — optional, skip SQS if absent
 *   BATCH_LIMIT     — max sponsors to process per run (default 100)
 */

import https from "https";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";

const REGION = process.env.AWS_REGION || "eu-west-2";
const smClient = new SecretsManagerClient({ region: REGION });
const sqsClient = new SQSClient({ region: REGION });

const CH_HOST = "api.company-information.service.gov.uk";
const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || "100", 10);
const CH_DELAY_MS = 100; // 600 req/min → ~10 req/s

// ─── Secrets ──────────────────────────────────────────────────────────────────

const _cache = {};
async function getSecret(id) {
  if (_cache[id]) return _cache[id];
  const res = await smClient.send(new GetSecretValueCommand({ SecretId: id }));
  _cache[id] = res.SecretString;
  return res.SecretString;
}

async function loadConfig() {
  const [tsKey, chKey] = await Promise.all([
    process.env.TYPESENSE_ADMIN_KEY  ?? getSecret("prod/typesense-admin-key"),
    process.env.COMPANIES_HOUSE_API_KEY ?? getSecret("prod/companies-house-api-key"),
  ]);
  return { tsKey, chKey };
}

// ─── Typesense ────────────────────────────────────────────────────────────────

function tsRequest(method, path, body, tsKey) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: TYPESENSE_HOST,
      path,
      method,
      headers: {
        "X-TYPESENSE-API-KEY": tsKey,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let d = "";
      res.on("data", c => { d += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function tsUpdateBatch(updates, tsKey) {
  const ndjson = updates.map(u => JSON.stringify(u)).join("\n");
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TYPESENSE_HOST,
      path: "/collections/sponsors/documents/import?action=update",
      method: "POST",
      headers: {
        "X-TYPESENSE-API-KEY": tsKey,
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(ndjson),
      },
    }, res => {
      let d = "";
      res.on("data", c => { d += c; });
      res.on("end", () => {
        const rows = d.trim().split("\n").map(l => { try { return JSON.parse(l); } catch { return { success: false }; } });
        resolve({ total: rows.length, failed: rows.filter(r => !r.success).length });
      });
    });
    req.on("error", reject);
    req.write(ndjson);
    req.end();
  });
}

async function fetchPendingSponsors(tsKey) {
  const params = new URLSearchParams({
    q:         "*",
    query_by:  "name",
    filter_by: "fingerprintStatus:=pending",
    per_page:  String(BATCH_LIMIT),
    page:      "1",
  });
  const res = await tsRequest("GET", `/collections/sponsors/documents/search?${params}`, null, tsKey);
  if (res.status !== 200) throw new Error(`Typesense search failed (${res.status}): ${JSON.stringify(res.body)}`);
  return (res.body.hits || []).map(h => h.document);
}

// ─── Companies House ──────────────────────────────────────────────────────────

function chGet(path, chKey) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${chKey}:`).toString("base64");
    const req = https.request({
      hostname: CH_HOST,
      path,
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "User-Agent": "SponsorMap/1.0 (+https://sponsormap.engtx.co.uk)",
      },
    }, res => {
      let d = "";
      res.on("data", c => { d += c; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: {} }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Returns a normalised website URL for the given company name, or null if not found.
 * Makes 2 CH API calls: search + company profile.
 */
async function findCompanyWebsite(name, chKey) {
  const encoded = encodeURIComponent(name);
  const searchRes = await chGet(`/search/companies?q=${encoded}&items_per_page=1`, chKey);
  await sleep(CH_DELAY_MS);

  if (searchRes.status !== 200 || !searchRes.body.items?.length) return null;

  const { company_number: companyNumber } = searchRes.body.items[0];
  if (!companyNumber) return null;

  const profileRes = await chGet(`/company/${companyNumber}`, chKey);
  await sleep(CH_DELAY_MS);

  if (profileRes.status !== 200) return null;

  const raw = profileRes.body?.website_url ?? profileRes.body?.website ?? null;
  if (!raw) return null;

  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  return url.replace(/\/+$/, ""); // strip trailing slash
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── SQS ──────────────────────────────────────────────────────────────────────

async function enqueueSqsBatch(queueUrl, messages) {
  for (let i = 0; i < messages.length; i += 10) {
    const entries = messages.slice(i, i + 10).map((m, j) => ({
      Id: String(i + j),
      MessageBody: JSON.stringify(m),
    }));
    await sqsClient.send(new SendMessageBatchCommand({ QueueUrl: queueUrl, Entries: entries }));
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handler(event) {
  const { tsKey, chKey } = await loadConfig();
  const sqsQueueUrl = process.env.SQS_QUEUE_URL;

  console.log(`Fetching up to ${BATCH_LIMIT} pending sponsors...`);
  const sponsors = await fetchPendingSponsors(tsKey);
  console.log(`Processing ${sponsors.length} sponsors.`);

  const tsUpdates = [];
  const sqsMessages = [];
  let found = 0, notFound = 0, errors = 0;

  for (const sponsor of sponsors) {
    try {
      const website = await findCompanyWebsite(sponsor.name, chKey);

      if (website) {
        tsUpdates.push({ id: sponsor.id, fingerprintStatus: "ch-done", websiteUrl: website });
        sqsMessages.push({ sponsorSlug: sponsor.slug, websiteUrl: website });
        found++;
      } else {
        tsUpdates.push({ id: sponsor.id, fingerprintStatus: "no-website" });
        notFound++;
      }
    } catch (err) {
      console.error(`Error processing "${sponsor.name}":`, err.message);
      tsUpdates.push({ id: sponsor.id, fingerprintStatus: "failed" });
      errors++;
    }
  }

  if (tsUpdates.length > 0) {
    const result = await tsUpdateBatch(tsUpdates, tsKey);
    console.log(`Typesense update: ${result.total - result.failed} ok, ${result.failed} failed`);
  }

  if (sqsQueueUrl && sqsMessages.length > 0) {
    await enqueueSqsBatch(sqsQueueUrl, sqsMessages);
    console.log(`Enqueued ${sqsMessages.length} SQS messages for ATS fingerprinting`);
  }

  const summary = { processed: sponsors.length, found, notFound, errors };
  console.log("Summary:", summary);
  return summary;
}

// Local runner
if (process.argv[1] === new URL(import.meta.url).pathname) {
  handler({}).catch(err => { console.error("Fatal:", err.message); process.exit(1); });
}
