/**
 * Shared utilities for job scraper Lambdas.
 * Typesense helpers, secret loading, salary parsing.
 */

import https from "https";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-west-2";
export const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";

const smClient = new SecretsManagerClient({ region: REGION });
const _secretCache = {};

export async function getSecret(id) {
  if (_secretCache[id]) return _secretCache[id];
  const res = await smClient.send(new GetSecretValueCommand({ SecretId: id }));
  _secretCache[id] = res.SecretString;
  return res.SecretString;
}

export async function loadAdminKey() {
  return process.env.TYPESENSE_ADMIN_KEY ?? getSecret("prod/typesense-admin-key");
}

// ─── Typesense helpers ────────────────────────────────────────────────────────

export function tsRequest(method, path, body, adminKey) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: TYPESENSE_HOST,
      path,
      method,
      headers: {
        "X-TYPESENSE-API-KEY": adminKey,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export function tsImportBatch(docs, adminKey) {
  const ndjson = docs.map(d => JSON.stringify(d)).join("\n");
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TYPESENSE_HOST,
      path: "/collections/jobs/documents/import?action=upsert",
      method: "POST",
      headers: {
        "X-TYPESENSE-API-KEY": adminKey,
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(ndjson),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        const lines = data.trim().split("\n");
        const results = lines.map(l => { try { return JSON.parse(l); } catch { return { success: false, error: l }; } });
        const failed = results.filter(r => !r.success);
        if (failed.length) console.warn(`  Import failures: ${failed.length}`, failed.slice(0, 3));
        resolve({ total: results.length, failed: failed.length });
      });
    });
    req.on("error", reject);
    req.write(ndjson);
    req.end();
  });
}

/**
 * Fetch all sponsors of a given atsType from Typesense (handles pagination).
 */
export async function fetchSponsorsByAtsType(atsType, adminKey) {
  const sponsors = [];
  const perPage = 250;
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      q: "*",
      query_by: "name",
      filter_by: `atsType:=${atsType} && fingerprintStatus:=done`,
      per_page: String(perPage),
      page: String(page),
    });
    const res = await tsRequest("GET", `/collections/sponsors/documents/search?${params}`, null, adminKey);
    if (res.status !== 200) throw new Error(`Typesense search failed (${res.status}): ${JSON.stringify(res.body)}`);
    const hits = res.body.hits || [];
    for (const hit of hits) sponsors.push(hit.document);
    if (hits.length < perPage) break;
    page++;
  }

  return sponsors;
}

/**
 * Expire jobs for a sponsor that weren't seen in the latest scrape.
 * liveIds: Set of ATS job IDs seen in the latest API response.
 */
export async function expireStaleJobs(sponsorSlug, liveJobIds, adminKey) {
  // Fetch all active jobs for this sponsor
  const params = new URLSearchParams({
    q: "*",
    query_by: "title",
    filter_by: `sponsorSlug:=${sponsorSlug} && status:=active`,
    per_page: "250",
    page: "1",
  });
  const res = await tsRequest("GET", `/collections/jobs/documents/search?${params}`, null, adminKey);
  if (res.status !== 200) return;

  const hits = res.body.hits || [];
  const toExpire = hits
    .map(h => h.document)
    .filter(d => !liveJobIds.has(d.id));

  if (!toExpire.length) return;

  const updates = toExpire.map(d => ({ id: d.id, status: "expired" }));
  await tsImportBatch(updates, adminKey);
  console.log(`  Expired ${updates.length} stale jobs for ${sponsorSlug}`);
}

/**
 * Update sponsor jobCount in the sponsors collection.
 */
export async function updateSponsorJobCount(sponsorSlug, count, adminKey) {
  const res = await tsRequest(
    "PATCH",
    `/collections/sponsors/documents/${sponsorSlug}`,
    { jobCount: count },
    adminKey,
  );
  if (res.status !== 200) {
    console.warn(`  Failed to update jobCount for ${sponsorSlug}: ${res.status}`);
  }
}

// ─── Salary parsing ───────────────────────────────────────────────────────────

const GBP_RE = /£\s*([\d,]+)(?:\s*[-–]\s*£?\s*([\d,]+))?/;

export function parseSalary(text) {
  if (!text) return { salaryMin: 0, salaryMax: 0 };
  const m = GBP_RE.exec(text);
  if (!m) return { salaryMin: 0, salaryMax: 0 };
  const lo = parseInt(m[1].replace(/,/g, ""), 10);
  const hi = m[2] ? parseInt(m[2].replace(/,/g, ""), 10) : lo;
  // Treat values < 1000 as "k" shorthand
  return {
    salaryMin: lo < 1000 ? lo * 1000 : lo,
    salaryMax: hi < 1000 ? hi * 1000 : hi,
  };
}

// ─── Page-based ATS URL resolver ─────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 12_000;

/**
 * Fetch a company careers page (following redirects) and return the final URL + HTML.
 */
export async function resolveCareersPage(careersUrl) {
  try {
    const res = await fetch(careersUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SponsorMap/1.0; +https://sponsormap.engtx.co.uk)",
        "Accept": "text/html,*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const finalUrl = res.url;
    const html = await res.text();
    return { finalUrl, html };
  } catch {
    return { finalUrl: careersUrl, html: "" };
  }
}

// ─── Slug sanitisation ────────────────────────────────────────────────────────

export function makeJobId(sponsorSlug, atsJobId) {
  const safe = String(atsJobId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `${sponsorSlug}-${safe}`;
}
