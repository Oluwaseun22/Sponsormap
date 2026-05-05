/**
 * Job expiry Lambda.
 *
 * Runs daily at 22:00 UTC via EventBridge (sponsormap-job-expiry-daily).
 * Finds active jobs not scraped in the last 48 hours and marks them expired.
 * Updates sponsor jobCount to reflect only active jobs.
 */

import https from "https";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-west-2";
const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const STALE_HOURS = parseInt(process.env.STALE_HOURS || "48", 10);

const smClient = new SecretsManagerClient({ region: REGION });
const _secretCache = {};

async function getSecret(id) {
  if (_secretCache[id]) return _secretCache[id];
  const res = await smClient.send(new GetSecretValueCommand({ SecretId: id }));
  _secretCache[id] = res.SecretString;
  return res.SecretString;
}

function tsRequest(method, path, body, adminKey) {
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

function tsImportBatch(docs, adminKey) {
  const ndjson = docs.map(d => JSON.stringify(d)).join("\n");
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TYPESENSE_HOST,
      path: "/collections/jobs/documents/import?action=update",
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
        const results = lines.map(l => { try { return JSON.parse(l); } catch { return { success: false }; } });
        resolve({ total: results.length, failed: results.filter(r => !r.success).length });
      });
    });
    req.on("error", reject);
    req.write(ndjson);
    req.end();
  });
}

async function fetchStaleActiveJobs(cutoffIso, adminKey) {
  // Typesense doesn't support date range filter on string fields directly,
  // so we fetch all active jobs and filter in-memory by scrapedAt.
  const staleJobs = [];
  const perPage = 250;
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      q: "*",
      query_by: "title",
      filter_by: "status:=active",
      per_page: String(perPage),
      page: String(page),
    });
    const res = await tsRequest("GET", `/collections/jobs/documents/search?${params}`, null, adminKey);
    if (res.status !== 200) throw new Error(`Typesense search failed: ${JSON.stringify(res.body)}`);
    const hits = res.body.hits || [];
    for (const hit of hits) {
      const doc = hit.document;
      if (!doc.scrapedAt || doc.scrapedAt < cutoffIso) {
        staleJobs.push(doc);
      }
    }
    if (hits.length < perPage) break;
    page++;
  }

  return staleJobs;
}

async function updateSponsorJobCounts(expiredSlugs, adminKey) {
  // For each affected sponsor, count remaining active jobs and update
  const uniqueSlugs = [...new Set(expiredSlugs)];
  for (const slug of uniqueSlugs) {
    const params = new URLSearchParams({
      q: "*",
      query_by: "title",
      filter_by: `sponsorSlug:=${slug} && status:=active`,
      per_page: "1",
      page: "1",
    });
    const res = await tsRequest("GET", `/collections/jobs/documents/search?${params}`, null, adminKey);
    const count = res.status === 200 ? (res.body.found || 0) : 0;
    await tsRequest("PATCH", `/collections/sponsors/documents/${slug}`, { jobCount: count }, adminKey);
  }
}

export async function handler() {
  const adminKey = process.env.TYPESENSE_ADMIN_KEY ?? await getSecret("prod/typesense-admin-key");

  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();
  console.log(`Expiring jobs not scraped since ${cutoffIso}`);

  const staleJobs = await fetchStaleActiveJobs(cutoffIso, adminKey);
  console.log(`Found ${staleJobs.length} stale active jobs`);

  if (!staleJobs.length) {
    return { statusCode: 200, body: "No stale jobs found" };
  }

  // Mark all stale jobs as expired in batches
  const BATCH_SIZE = 100;
  let totalExpired = 0;
  for (let i = 0; i < staleJobs.length; i += BATCH_SIZE) {
    const chunk = staleJobs.slice(i, i + BATCH_SIZE);
    const updates = chunk.map(j => ({ id: j.id, status: "expired" }));
    const result = await tsImportBatch(updates, adminKey);
    totalExpired += result.total - result.failed;
  }

  console.log(`Expired ${totalExpired} jobs`);

  // Update sponsor job counts
  const affectedSlugs = staleJobs.map(j => j.sponsorSlug);
  await updateSponsorJobCounts(affectedSlugs, adminKey);
  console.log(`Updated jobCount for ${new Set(affectedSlugs).size} sponsors`);

  return {
    statusCode: 200,
    body: JSON.stringify({ expired: totalExpired, sponsorsUpdated: new Set(affectedSlugs).size }),
  };
}
