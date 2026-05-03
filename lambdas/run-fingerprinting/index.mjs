/**
 * Local runner: fingerprints up to N sponsors end-to-end.
 *
 * Strategy per sponsor:
 *   1. Query Companies House API for website_url
 *   2. If CH has nothing, try domain-guessing from company name
 *   3. Run ATS fingerprinting on any valid URL found
 *   4. Update Typesense
 *
 * Usage:
 *   TYPESENSE_HOST=... TYPESENSE_ADMIN_KEY=... COMPANIES_HOUSE_API_KEY=... \
 *     node lambdas/run-fingerprinting/index.mjs [--limit 1000]
 */

import https from "https";
import http from "http";
import { URL } from "url";

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const TYPESENSE_ADMIN_KEY = process.env.TYPESENSE_ADMIN_KEY;
const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const CH_HOST = "api.company-information.service.gov.uk";

const LIMIT = (() => {
  const idx = process.argv.indexOf("--limit");
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 1000;
})();

const CH_DELAY_MS    = 110;  // 600 req/min → 100ms minimum; 110ms for safety
const FETCH_TIMEOUT  = 10_000;
const MAX_CONCURRENT = 8;
const BATCH_DELAY_MS = 500;

// ─── ATS patterns ─────────────────────────────────────────────────────────────

const ATS_PATTERNS = [
  { name: "Greenhouse",      patterns: [/greenhouse\.io/, /boards\.greenhouse\.net/] },
  { name: "Workday",         patterns: [/workday\.com/, /myworkdayjobs\.com/] },
  { name: "Lever",           patterns: [/lever\.co/, /jobs\.lever\.co/] },
  { name: "Ashby",           patterns: [/ashbyhq\.com/] },
  { name: "SmartRecruiters", patterns: [/smartrecruiters\.com/] },
  { name: "TeamTailor",      patterns: [/teamtailor\.com/] },
  { name: "Recruitee",       patterns: [/recruitee\.com/] },
  { name: "Personio",        patterns: [/personio\.com/] },
  { name: "BambooHR",        patterns: [/bamboohr\.com/] },
];

const CAREERS_PATHS = [
  "/careers", "/jobs", "/join-us", "/work-with-us",
  "/careers/", "/about/careers", "/about/jobs", "/en/careers",
];

// ─── Domain guessing ──────────────────────────────────────────────────────────

const STRIP_SUFFIXES = [
  / plc\.?$/i, / ltd\.?$/i, / limited$/i, / llp$/i, / llc$/i,
  / uk$/i, / uk limited$/i, / uk ltd$/i, / \(uk\)$/i,
  / group$/i, / holdings$/i, / international$/i, / global$/i,
  / services$/i, / solutions$/i, / technologies$/i, / technology$/i,
  / systems$/i, / consulting$/i, / consultancy$/i,
  / bank$/i, / & co$/i, / and co$/i,
];

function guessDomainsFromName(name) {
  let cleaned = name;
  for (const pat of STRIP_SUFFIXES) cleaned = cleaned.replace(pat, "");
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");
  if (!cleaned || cleaned.length < 2) return [];
  return [
    `https://www.${cleaned}.co.uk`,
    `https://www.${cleaned}.com`,
    `https://${cleaned}.co.uk`,
    `https://${cleaned}.com`,
  ];
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function httpGet(urlStr, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft === 0) return reject(new Error("Too many redirects"));
    let parsed;
    try { parsed = new URL(urlStr); } catch { return reject(new Error(`Bad URL: ${urlStr}`)); }

    const client = parsed.protocol === "https:" ? https : http;
    const timer = setTimeout(() => { req.destroy(); reject(new Error(`Timeout: ${urlStr}`)); }, FETCH_TIMEOUT);

    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: (parsed.pathname || "/") + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SponsorMap/1.0; +https://sponsormap.engtx.co.uk)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    }, res => {
      clearTimeout(timer);
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = new URL(res.headers.location, urlStr).toString();
        res.destroy();
        return httpGet(next, redirectsLeft - 1).then(resolve).catch(reject);
      }
      let body = "";
      res.on("data", chunk => { body += chunk; if (body.length > 60_000) res.destroy(); });
      res.on("end",  () => resolve({ finalUrl: urlStr, status: res.statusCode, body }));
      res.on("close",() => resolve({ finalUrl: urlStr, status: res.statusCode, body }));
    });
    req.on("error", err => { clearTimeout(timer); reject(err); });
    req.end();
  });
}

// ─── Companies House ──────────────────────────────────────────────────────────

function chGet(path) {
  const auth = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString("base64");
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: CH_HOST, path, method: "GET",
      headers: { Authorization: `Basic ${auth}`, "User-Agent": "SponsorMap/1.0" },
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findWebsiteViaCH(name) {
  const encoded = encodeURIComponent(name);
  const searchRes = await chGet(`/search/companies?q=${encoded}&items_per_page=1`);
  await sleep(CH_DELAY_MS);
  if (searchRes.status !== 200 || !searchRes.body.items?.length) return null;

  const { company_number } = searchRes.body.items[0];
  if (!company_number) return null;

  const profile = await chGet(`/company/${company_number}`);
  await sleep(CH_DELAY_MS);
  if (profile.status !== 200) return null;

  const raw = profile.body?.website_url ?? profile.body?.website ?? null;
  if (!raw) return null;
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  return url.replace(/\/+$/, "");
}

// ─── ATS detection ────────────────────────────────────────────────────────────

function detectAts(url, body) {
  for (const { name, patterns } of ATS_PATTERNS) {
    for (const p of patterns) {
      if (p.test(url) || p.test(body)) return name;
    }
  }
  return null;
}

async function probeWebsite(websiteUrl) {
  let parsed;
  try { parsed = new URL(websiteUrl); } catch { return null; }
  const domain = parsed.hostname.replace(/^www\./, "");

  const candidates = [
    ...CAREERS_PATHS.map(p => `${websiteUrl}${p}`),
    `https://jobs.${domain}`,
    `https://careers.${domain}`,
  ];

  for (const c of candidates) {
    try {
      const resp = await httpGet(c);
      if (!resp || resp.status < 200 || resp.status >= 400) continue;
      const ats = detectAts(resp.finalUrl, resp.body);
      return { careersUrl: resp.finalUrl, atsType: ats ?? "Unknown" };
    } catch { /* try next */ }
  }
  return null;
}

// ─── Typesense ────────────────────────────────────────────────────────────────

function tsGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TYPESENSE_HOST, path, method: "GET",
      headers: { "X-TYPESENSE-API-KEY": TYPESENSE_ADMIN_KEY, "Content-Type": "application/json" },
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

async function fetchPendingPage(page) {
  const params = new URLSearchParams({
    q: "*", query_by: "name",
    filter_by: "fingerprintStatus:=pending",
    per_page: "100", page: String(page),
    sort_by: "_text_match:desc",
  });
  const data = await tsGet(`/collections/sponsors/documents/search?${params}`);
  return (data.hits || []).map(h => h.document);
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────

async function pool(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const batch = await Promise.all(chunk.map(fn));
    results.push(...batch);
    if (i + concurrency < items.length) await sleep(BATCH_DELAY_MS);
  }
  return results;
}

// ─── Process one sponsor ──────────────────────────────────────────────────────

async function processOneSponsor(sponsor) {
  // Step 1: find website
  let websiteUrl = null;

  try {
    websiteUrl = await findWebsiteViaCH(sponsor.name);
  } catch (err) {
    // CH lookup failed — carry on to domain guessing
  }

  if (!websiteUrl) {
    // Step 2: domain guessing
    const guesses = guessDomainsFromName(sponsor.name);
    for (const guess of guesses) {
      try {
        const resp = await httpGet(guess);
        if (resp && resp.status >= 200 && resp.status < 400) {
          websiteUrl = guess;
          break;
        }
      } catch { /* try next */ }
    }
  }

  if (!websiteUrl) {
    return { id: sponsor.id, fingerprintStatus: "no-website" };
  }

  // Step 3: ATS fingerprinting
  try {
    const result = await probeWebsite(websiteUrl);
    if (!result) {
      return {
        id: sponsor.id,
        websiteUrl,
        fingerprintStatus: "no-careers-page",
        fingerprintedAt: new Date().toISOString(),
      };
    }
    return {
      id:                sponsor.id,
      websiteUrl,
      careersUrl:        result.careersUrl,
      atsType:           result.atsType,
      fingerprintStatus: "done",
      fingerprintedAt:   new Date().toISOString(),
    };
  } catch (err) {
    return {
      id: sponsor.id,
      websiteUrl,
      fingerprintStatus: "failed",
      fingerprintedAt: new Date().toISOString(),
    };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  if (!TYPESENSE_ADMIN_KEY) throw new Error("TYPESENSE_ADMIN_KEY required");
  if (!COMPANIES_HOUSE_API_KEY) throw new Error("COMPANIES_HOUSE_API_KEY required");

  console.log(`\nRunning ATS fingerprinting on up to ${LIMIT} sponsors...\n`);

  let processed = 0, withWebsite = 0, withCareers = 0, withAts = 0, page = 1;

  while (processed < LIMIT) {
    const remaining = LIMIT - processed;
    const batch = await fetchPendingPage(page);
    if (batch.length === 0) { console.log("No more pending sponsors."); break; }

    const toProcess = batch.slice(0, Math.min(remaining, batch.length));
    console.log(`Processing page ${page}: ${toProcess.length} sponsors (${processed} done so far)...`);

    const updates = await pool(toProcess, MAX_CONCURRENT, processOneSponsor);

    // Flush Typesense
    const res = await tsUpdateBatch(updates);
    console.log(`  Typesense update: ${res.total - res.failed} ok, ${res.failed} failed`);

    // Stats
    for (const u of updates) {
      processed++;
      if (u.websiteUrl)   withWebsite++;
      if (u.careersUrl)   withCareers++;
      if (u.atsType && u.atsType !== "Unknown") withAts++;
    }

    const pctWebsite = ((withWebsite / processed) * 100).toFixed(1);
    const pctCareers = ((withCareers / processed) * 100).toFixed(1);
    console.log(`  Running totals: ${processed} processed | ${withWebsite} (${pctWebsite}%) have website | ${withCareers} (${pctCareers}%) have careersUrl | ${withAts} ATS identified\n`);

    if (batch.length < 100) { console.log("Reached end of pending list."); break; }
    page++;
  }

  console.log("=== Final Summary ===");
  console.log(`  Processed:       ${processed}`);
  console.log(`  With website:    ${withWebsite} (${((withWebsite/processed)*100).toFixed(1)}%)`);
  console.log(`  With careersUrl: ${withCareers} (${((withCareers/processed)*100).toFixed(1)}%)`);
  console.log(`  ATS identified:  ${withAts}`);
}

run().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
