/**
 * Re-runs ATS detection on sponsors already classified as "Unknown"
 * using the expanded ATS_PATTERNS with Workday subdomains, SuccessFactors, etc.
 *
 * Usage:
 *   TYPESENSE_HOST=... TYPESENSE_ADMIN_KEY=... node lambdas/run-fingerprinting/reclassify-unknown.mjs
 */

import https from "https";
import http from "http";
import { URL } from "url";

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const TYPESENSE_ADMIN_KEY = process.env.TYPESENSE_ADMIN_KEY;
const FETCH_TIMEOUT = 10_000;
const MAX_CONCURRENT = 10;
const BATCH_SIZE = 250;

const ATS_PATTERNS = [
  { name: "Greenhouse",      patterns: [/greenhouse\.io/, /boards\.greenhouse\.net/, /grnhse_app/, /greenhouse-jobboard/] },
  { name: "Workday",         patterns: [/workday\.com/, /myworkdayjobs\.com/, /wd1\.myworkdayjobs/, /wd3\.myworkdayjobs/, /wd5\.myworkdayjobs/, /\.wd\d\./] },
  { name: "Lever",           patterns: [/jobs\.lever\.co/, /apply\.lever\.co/, /lever\.co\/apply/, /lever\.co\/jobs/, /lever-jobs-container/] },
  { name: "Ashby",           patterns: [/ashbyhq\.com/, /ashby-application/] },
  { name: "SmartRecruiters", patterns: [/smartrecruiters\.com/, /careers\.smartrecruiters/, /smartjobs/] },
  { name: "TeamTailor",      patterns: [/teamtailor\.com/, /career\.teamtailor/, /teamtailor-jobs/] },
  { name: "Recruitee",       patterns: [/recruitee\.com/] },
  { name: "Personio",        patterns: [/personio\.com/, /jobs\.personio/, /personio-job-listing/] },
  { name: "BambooHR",        patterns: [/bamboohr\.com/, /app\.bamboohr\.com/] },
  { name: "SAP SuccessFactors", patterns: [/successfactors\.com/, /successfactors\.eu/, /sfsf\.com/] },
  { name: "iCIMS",           patterns: [/icims\.com/, /careers\.icims\.com/] },
  { name: "Taleo",           patterns: [/taleo\.net/, /oracle\.taleo/, /tbe\.taleo/] },
  { name: "Jobvite",         patterns: [/jobvite\.com/, /jobs\.jobvite\.com/] },
  { name: "Workable",        patterns: [/workable\.com/, /apply\.workable\.com/] },
  { name: "Jazz",            patterns: [/jazz\.co/, /app\.jazz\.co/, /resumatorcdn/] },
];

function extractEmbeddedUrls(html) {
  const urls = [];
  const attrRe = /(?:src|href|action|data-[a-z-]+)\s*=\s*["']([^"']{4,300})["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) urls.push(m[1]);
  const jsRe = /["'\`](https?:\/\/[^"'\`\s]{8,300})["'\`]/g;
  while ((m = jsRe.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

function detectAts(url, body) {
  for (const { name, patterns } of ATS_PATTERNS) {
    for (const p of patterns) { if (p.test(url)) return name; }
  }
  for (const { name, patterns } of ATS_PATTERNS) {
    for (const p of patterns) { if (p.test(body)) return name; }
  }
  for (const eu of extractEmbeddedUrls(body)) {
    for (const { name, patterns } of ATS_PATTERNS) {
      for (const p of patterns) { if (p.test(eu)) return name; }
    }
  }
  return null;
}

function httpGet(urlStr, redirectsLeft = 6) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft === 0) return reject(new Error("Too many redirects"));
    let parsed;
    try { parsed = new URL(urlStr); } catch { return reject(new Error(`Bad URL`)); }
    const client = parsed.protocol === "https:" ? https : http;
    const timer = setTimeout(() => { req.destroy(); reject(new Error("Timeout")); }, FETCH_TIMEOUT);
    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: (parsed.pathname || "/") + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SponsorMap/1.0)",
        Accept: "text/html,*/*",
      },
    }, res => {
      clearTimeout(timer);
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = new URL(res.headers.location, urlStr).toString();
        res.destroy();
        return httpGet(next, redirectsLeft - 1).then(resolve).catch(reject);
      }
      let body = "";
      res.on("data", c => { body += c; if (body.length > 200_000) res.destroy(); });
      res.on("end",  () => resolve({ finalUrl: urlStr, status: res.statusCode, body }));
      res.on("close",() => resolve({ finalUrl: urlStr, status: res.statusCode, body }));
    });
    req.on("error", e => { clearTimeout(timer); reject(e); });
    req.end();
  });
}

function tsSearch(filterBy, page) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      q: "*", query_by: "name",
      filter_by: filterBy,
      per_page: String(BATCH_SIZE),
      page: String(page),
      include_fields: "id,slug,name,careersUrl",
    });
    const req = https.request({
      hostname: TYPESENSE_HOST,
      path: `/collections/sponsors/documents/search?${params}`,
      method: "GET",
      headers: { "X-TYPESENSE-API-KEY": TYPESENSE_ADMIN_KEY },
    }, res => {
      let d = "";
      res.on("data", c => { d += c; });
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on("error", reject);
    req.end();
  });
}

function tsUpdateBatch(updates) {
  const ndjson = updates.map(u => JSON.stringify(u)).join("\n");
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TYPESENSE_HOST,
      path: "/collections/sponsors/documents/import?action=update",
      method: "POST",
      headers: {
        "X-TYPESENSE-API-KEY": TYPESENSE_ADMIN_KEY,
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

async function recheckOne(doc) {
  if (!doc.careersUrl) return null;
  try {
    const resp = await httpGet(doc.careersUrl);
    if (!resp || resp.status >= 400) return null;
    const ats = detectAts(resp.finalUrl, resp.body);
    if (!ats) return null; // Still unknown
    return { id: doc.id, atsType: ats };
  } catch {
    return null;
  }
}

async function pool(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
}

async function run() {
  if (!TYPESENSE_ADMIN_KEY) throw new Error("TYPESENSE_ADMIN_KEY required");
  console.log("Re-checking Unknown sponsors with expanded ATS patterns...\n");

  let reclassified = 0, page = 1;

  while (true) {
    const data = await tsSearch("atsType:=Unknown", page);
    const docs = (data.hits || []).map(h => h.document);
    if (docs.length === 0) break;

    console.log(`Page ${page}: checking ${docs.length} Unknown sponsors...`);
    const results = await pool(docs, MAX_CONCURRENT, recheckOne);

    const updates = results.filter(Boolean);
    if (updates.length > 0) {
      await tsUpdateBatch(updates);
      reclassified += updates.length;
      console.log(`  Re-classified ${updates.length}: ${updates.map(u => u.atsType).join(", ")}`);
    } else {
      console.log(`  None re-classified on this page.`);
    }

    if (docs.length < BATCH_SIZE) break;

    // Increase page only if no re-classifications (re-classified docs leave atsType!=Unknown so next search shifts)
    if (updates.length === 0) page++;
  }

  console.log(`\nTotal re-classified: ${reclassified}`);
}

run().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
