/**
 * ATS Fingerprinter Lambda
 *
 * Triggered by SQS messages { sponsorSlug, websiteUrl } OR runs a batch poll
 * against Typesense for sponsors with fingerprintStatus="ch-done".
 *
 * For each sponsor:
 *   1. Probes common careers page paths on their website
 *   2. Detects ATS by URL patterns in the final resolved URL
 *   3. Updates Typesense with atsType, careersUrl, fingerprintStatus, fingerprintedAt
 *
 * Env vars (or AWS Secrets Manager if not set):
 *   TYPESENSE_HOST, TYPESENSE_ADMIN_KEY
 *   SQS_QUEUE_URL   — optional, used when running as a batch poller
 *   BATCH_LIMIT     — max sponsors per poll run (default 50)
 */

import https from "https";
import http from "http";
import { URL } from "url";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-west-2";
const smClient = new SecretsManagerClient({ region: REGION });

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT || "50", 10);
const MAX_CONCURRENT = 10;
const BATCH_DELAY_MS = 500;
const FETCH_TIMEOUT_MS = 10_000;

// ─── ATS patterns ─────────────────────────────────────────────────────────────

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

// Paths to probe on the company's own domain
const CAREERS_PATHS = [
  "/careers",
  "/jobs",
  "/join-us",
  "/work-with-us",
  "/careers/",
  "/about/careers",
  "/about/jobs",
];

// ─── Secrets ──────────────────────────────────────────────────────────────────

const _secretCache = {};
async function getSecret(id) {
  if (_secretCache[id]) return _secretCache[id];
  const res = await smClient.send(new GetSecretValueCommand({ SecretId: id }));
  _secretCache[id] = res.SecretString;
  return res.SecretString;
}

async function loadTsKey() {
  return process.env.TYPESENSE_ADMIN_KEY ?? getSecret("prod/typesense-admin-key");
}

// ─── HTTP fetch with redirect following ───────────────────────────────────────

function fetchWithRedirects(urlStr, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft === 0) return reject(new Error("Too many redirects"));
    let parsed;
    try { parsed = new URL(urlStr); } catch { return reject(new Error(`Invalid URL: ${urlStr}`)); }

    const client = parsed.protocol === "https:" ? https : http;
    const timer = setTimeout(() => { req.destroy(); reject(new Error(`Timeout: ${urlStr}`)); }, FETCH_TIMEOUT_MS);

    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SponsorMap/1.0; +https://sponsormap.engtx.co.uk)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }, res => {
      clearTimeout(timer);
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = new URL(res.headers.location, urlStr).toString();
        res.destroy();
        return fetchWithRedirects(next, redirectsLeft - 1).then(resolve).catch(reject);
      }
      let body = "";
      res.on("data", chunk => {
        body += chunk;
        if (body.length > 200_000) res.destroy(); // cap at 200KB — enough for ATS iframe/script detection
      });
      res.on("end",   () => resolve({ url: urlStr, finalUrl: urlStr, status: res.statusCode, body }));
      res.on("close", () => resolve({ url: urlStr, finalUrl: urlStr, status: res.statusCode, body }));
    });
    req.on("error", err => { clearTimeout(timer); reject(err); });
    req.end();
  });
}

// ─── ATS detection ────────────────────────────────────────────────────────────

/**
 * Extracts all URL-like strings from HTML attributes (src, href, action, data-*)
 * and JS string literals, then runs ATS pattern matching against them.
 * This catches ATS embedded via iframes, script tags, and <a> links whose
 * URL doesn't appear in the final redirect chain.
 */
function extractEmbeddedUrls(html) {
  const urls = [];
  // iframe src, script src, form action, link href, img src, a href
  const attrRe = /(?:src|href|action|data-[a-z-]+)\s*=\s*["']([^"']{4,300})["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) urls.push(m[1]);
  // JSON / JS string literals that look like URLs
  const jsRe = /["'`](https?:\/\/[^"'`\s]{8,300})["'`]/g;
  while ((m = jsRe.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

function detectAts(finalUrl, body) {
  // 1. Check final redirect URL
  for (const { name, patterns } of ATS_PATTERNS) {
    for (const p of patterns) {
      if (p.test(finalUrl)) return name;
    }
  }
  // 2. Check full body text (catches plain-text mentions, JSON configs, etc.)
  for (const { name, patterns } of ATS_PATTERNS) {
    for (const p of patterns) {
      if (p.test(body)) return name;
    }
  }
  // 3. Deep-scan HTML attributes and embedded JS URL strings
  const embeddedUrls = extractEmbeddedUrls(body);
  for (const url of embeddedUrls) {
    for (const { name, patterns } of ATS_PATTERNS) {
      for (const p of patterns) {
        if (p.test(url)) return name;
      }
    }
  }
  return null;
}

// ─── Careers page probing ─────────────────────────────────────────────────────

/**
 * Returns { careersUrl, atsType } or null if no careers page found.
 * Also checks subdomain variants (jobs.domain, careers.domain).
 */
async function fingerprint(websiteUrl) {
  let parsed;
  try { parsed = new URL(websiteUrl); } catch { return null; }
  const domain = parsed.hostname.replace(/^www\./, "");

  // Build candidate URLs: own-domain paths + common subdomains
  const candidates = [
    ...CAREERS_PATHS.map(p => `${websiteUrl}${p}`),
    `https://jobs.${domain}`,
    `https://careers.${domain}`,
  ];

  for (const candidate of candidates) {
    try {
      const resp = await fetchWithRedirects(candidate);
      if (resp.status < 200 || resp.status >= 400) continue;

      const ats = detectAts(resp.finalUrl ?? candidate, resp.body);

      // If redirect landed on an ATS domain, use that as careersUrl
      const careersUrl = resp.finalUrl ?? candidate;
      return { careersUrl, atsType: ats ?? "Unknown" };
    } catch {
      // try next candidate
    }
  }
  return null;
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

async function fetchChDoneSponsors(tsKey) {
  const params = new URLSearchParams({
    q:         "*",
    query_by:  "name",
    filter_by: "fingerprintStatus:=ch-done",
    per_page:  String(BATCH_LIMIT),
    page:      "1",
  });
  const res = await tsRequest("GET", `/collections/sponsors/documents/search?${params}`, null, tsKey);
  if (res.status !== 200) throw new Error(`Typesense search failed (${res.status}): ${JSON.stringify(res.body)}`);
  return (res.body.hits || []).map(h => h.document);
}

// ─── Concurrency helper ───────────────────────────────────────────────────────

async function processWithConcurrency(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }
  return results;
}

// ─── Process a single sponsor ──────────────────────────────────────────────────

async function processSponsor(slug, websiteUrl) {
  try {
    const result = await fingerprint(websiteUrl);
    if (!result) {
      return { id: slug, fingerprintStatus: "no-careers-page", fingerprintedAt: new Date().toISOString() };
    }
    return {
      id:                slug,
      atsType:           result.atsType,
      careersUrl:        result.careersUrl,
      fingerprintStatus: "done",
      fingerprintedAt:   new Date().toISOString(),
    };
  } catch (err) {
    console.error(`Failed to fingerprint ${slug}:`, err.message);
    return { id: slug, fingerprintStatus: "failed", fingerprintedAt: new Date().toISOString() };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function handler(event) {
  const tsKey = await loadTsKey();

  // SQS trigger: records = [{ body: '{"sponsorSlug":"...", "websiteUrl":"..."}' }]
  if (event?.Records?.length > 0) {
    const items = event.Records.map(r => {
      const msg = JSON.parse(r.body);
      return { slug: msg.sponsorSlug, websiteUrl: msg.websiteUrl };
    });

    console.log(`SQS mode: processing ${items.length} records`);
    const updates = await processWithConcurrency(
      items,
      MAX_CONCURRENT,
      ({ slug, websiteUrl }) => processSponsor(slug, websiteUrl)
    );

    if (updates.length > 0) {
      const result = await tsUpdateBatch(updates, tsKey);
      console.log(`Typesense update: ${result.total - result.failed} ok, ${result.failed} failed`);
    }

    const done = updates.filter(u => u.fingerprintStatus === "done").length;
    return { processed: updates.length, done };
  }

  // Batch poll mode: read ch-done sponsors from Typesense
  console.log(`Batch mode: fetching up to ${BATCH_LIMIT} ch-done sponsors...`);
  const sponsors = await fetchChDoneSponsors(tsKey);
  console.log(`Processing ${sponsors.length} sponsors.`);

  if (sponsors.length === 0) return { processed: 0, done: 0 };

  const items = sponsors.map(s => ({ slug: s.slug, websiteUrl: s.websiteUrl || "" })).filter(s => s.websiteUrl);
  const noUrl = sponsors.length - items.length;

  const updates = await processWithConcurrency(
    items,
    MAX_CONCURRENT,
    ({ slug, websiteUrl }) => processSponsor(slug, websiteUrl)
  );

  // Mark no-URL sponsors as failed
  for (const s of sponsors) {
    if (!s.websiteUrl) {
      updates.push({ id: s.id, fingerprintStatus: "failed", fingerprintedAt: new Date().toISOString() });
    }
  }

  if (updates.length > 0) {
    const result = await tsUpdateBatch(updates, tsKey);
    console.log(`Typesense update: ${result.total - result.failed} ok, ${result.failed} failed`);
  }

  const done = updates.filter(u => u.fingerprintStatus === "done").length;
  const summary = { processed: sponsors.length, done, noUrl, failed: updates.filter(u => u.fingerprintStatus === "failed").length };
  console.log("Summary:", summary);
  return summary;
}

// Local runner
if (process.argv[1] === new URL(import.meta.url).pathname) {
  handler({}).catch(err => { console.error("Fatal:", err.message); process.exit(1); });
}
