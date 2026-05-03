/**
 * Targeted fingerprinting for specific high-priority companies.
 * Run this alongside the main batch to ensure key companies are processed.
 *
 * Usage:
 *   TYPESENSE_HOST=... TYPESENSE_ADMIN_KEY=... node lambdas/run-fingerprinting/targeted.mjs
 */

import https from "https";
import http from "http";
import { URL } from "url";

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const TYPESENSE_ADMIN_KEY = process.env.TYPESENSE_ADMIN_KEY;
const FETCH_TIMEOUT = 10_000;

// High-priority companies — IDs verified against Typesense
const TARGETS = [
  { slug: "hsbc-holdings-plc",             website: "https://www.hsbc.com/careers" },
  { slug: "google-uk-limited",             website: "https://careers.google.com" },
  { slug: "amazon-uk-services-ltd",        website: "https://www.amazon.jobs" },
  { slug: "microsoft-limited",             website: "https://careers.microsoft.com" },
  { slug: "barclays-bank-uk-plc",          website: "https://home.barclays/careers" },
  { slug: "deloitte-llp",                  website: "https://jobs2.deloitte.com" },
  { slug: "kpmg-llp",                      website: "https://www.kpmg.com/uk/en/home/careers.html" },
  { slug: "accenture-uk-limited",          website: "https://www.accenture.com/gb-en/careers" },
  { slug: "bp-plc",                        website: "https://www.bp.com/en/global/corporate/careers.html" },
  { slug: "shell-international-ltd",       website: "https://www.shell.com/careers" },
  { slug: "unilever-uk-limited",           website: "https://careers.unilever.com" },
  { slug: "tesco-stores-limited",          website: "https://www.tesco-careers.com" },
  { slug: "rolls-royce-smr-limited",       website: "https://careers.rolls-royce.com" },
  { slug: "bae-systems-plc",               website: "https://www.baesystems.com/en/careers" },
  { slug: "vodafone-limited",              website: "https://careers.vodafone.com" },
  { slug: "bt-group",                      website: "https://careers.bt.com" },
  { slug: "lloyds-bank-plc",               website: "https://careers.lloydsbank.co.uk" },
  { slug: "natwest-group-plc",             website: "https://jobs.natwestgroup.com" },
  { slug: "astrazeneca-uk-limited",        website: "https://careers.astrazeneca.com" },
  { slug: "roofoods-ltd-ta-deliveroo",     website: "https://careers.deliveroo.co.uk" },
  { slug: "wise-payments-limited",         website: "https://wise.jobs" },
  { slug: "monzo-bank-ltd",                website: "https://monzo.com/careers" },
  { slug: "revolut-ltd",                   website: "https://www.revolut.com/careers" },
  { slug: "airbnb-uk-limited",             website: "https://careers.airbnb.com" },
  { slug: "uber-london-limited",           website: "https://www.uber.com/gb/en/careers" },
  { slug: "palantir-uk-limited",           website: "https://www.palantir.com/careers" },
  { slug: "palantir-technologies-uk-limited", website: "https://www.palantir.com/careers" },
  { slug: "shopify-uk-limited",            website: "https://www.shopify.com/careers" },
  { slug: "funding-circle-limited",        website: "https://www.fundingcircle.com/uk/careers" },
  // Big consulting/professional services
  { slug: "ernst-young-llp",               website: "https://www.ey.com/en_uk/careers" },
  // Pharma
  { slug: "glaxosmithkline-research-and-development-limited", website: "https://careers.gsk.com" },
  // Finance
  { slug: "hsbc-bank-plc",                 website: "https://www.hsbc.com/careers" },
];

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

const CAREERS_PATHS = [
  "", "/careers", "/jobs", "/join-us", "/work-with-us",
  "/careers/", "/about/careers", "/en/careers", "/en/jobs",
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

function httpGet(urlStr, redirectsLeft = 8) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft === 0) return reject(new Error("Too many redirects"));
    let parsed;
    try { parsed = new URL(urlStr); } catch { return reject(new Error(`Bad URL: ${urlStr}`)); }
    const client = parsed.protocol === "https:" ? https : http;
    const timer = setTimeout(() => { req.destroy(); reject(new Error(`Timeout`)); }, FETCH_TIMEOUT);
    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: (parsed.pathname || "/") + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SponsorMap/1.0)",
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
      res.on("data", c => { body += c; if (body.length > 200_000) res.destroy(); });
      res.on("end",  () => resolve({ finalUrl: urlStr, status: res.statusCode, body }));
      res.on("close",() => resolve({ finalUrl: urlStr, status: res.statusCode, body }));
    });
    req.on("error", e => { clearTimeout(timer); reject(e); });
    req.end();
  });
}

async function fingerprint(websiteUrl) {
  let parsed;
  try { parsed = new URL(websiteUrl); } catch { return null; }
  const domain = parsed.hostname.replace(/^www\./, "");

  const base = `${parsed.protocol}//${parsed.hostname}`;
  const candidates = [
    websiteUrl,
    ...CAREERS_PATHS.map(p => `${base}${p}`).filter(u => u !== websiteUrl),
    `https://jobs.${domain}`,
    `https://careers.${domain}`,
  ];

  for (const c of candidates) {
    try {
      const resp = await httpGet(c);
      if (!resp || resp.status < 200 || resp.status >= 400) continue;
      const ats = detectAts(resp.finalUrl, resp.body);
      if (ats) return { careersUrl: resp.finalUrl, atsType: ats };
      // If we found a page, keep it as Unknown even without ATS
      if (resp.status === 200 && resp.body.length > 500) {
        return { careersUrl: resp.finalUrl, atsType: "Unknown" };
      }
    } catch { /* try next */ }
  }
  return null;
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

// Get the actual document id (slug) from Typesense by searching by name
async function findDocId(slug) {
  const res = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: TYPESENSE_HOST,
      path: `/collections/sponsors/documents/${encodeURIComponent(slug)}`,
      method: "GET",
      headers: { "X-TYPESENSE-API-KEY": TYPESENSE_ADMIN_KEY },
    }, res => {
      let d = "";
      res.on("data", c => { d += c; });
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    });
    req.on("error", reject);
    req.end();
  });
  return res?.id ? res.id : null;
}

async function run() {
  if (!TYPESENSE_ADMIN_KEY) throw new Error("TYPESENSE_ADMIN_KEY required");
  console.log(`Targeted fingerprinting of ${TARGETS.length} priority companies...\n`);

  const updates = [];
  let found = 0, atsFound = 0;

  for (const target of TARGETS) {
    process.stdout.write(`  ${target.slug.slice(0, 40).padEnd(40)} `);
    try {
      const result = await fingerprint(target.website);
      if (result) {
        updates.push({
          id:                target.slug,
          websiteUrl:        target.website,
          careersUrl:        result.careersUrl,
          atsType:           result.atsType,
          fingerprintStatus: "done",
          fingerprintedAt:   new Date().toISOString(),
        });
        found++;
        if (result.atsType !== "Unknown") atsFound++;
        console.log(`✓ ${result.atsType} — ${result.careersUrl.slice(0, 60)}`);
      } else {
        updates.push({
          id:                target.slug,
          websiteUrl:        target.website,
          fingerprintStatus: "no-careers-page",
          fingerprintedAt:   new Date().toISOString(),
        });
        console.log(`– no careers page found`);
      }
    } catch (err) {
      updates.push({
        id:                target.slug,
        fingerprintStatus: "failed",
        fingerprintedAt:   new Date().toISOString(),
      });
      console.log(`✗ ${err.message}`);
    }
  }

  const result = await tsUpdateBatch(updates);
  console.log(`\nTypesense update: ${result.total - result.failed} ok, ${result.failed} failed`);
  console.log(`Found careers pages: ${found}/${TARGETS.length} | ATS identified: ${atsFound}`);
}

run().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
