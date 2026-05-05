/**
 * Workday job scraper Lambda.
 *
 * Reads sponsors with atsType=Workday, fetches jobs from the Workday
 * public CXS API, upserts into Typesense jobs collection.
 *
 * Workday URL patterns:
 *   https://{tenant}.wd{N}.myworkdayjobs.com/{board}
 *   https://{company}.myworkdayjobs.com/{tenant}/{board}
 */

import {
  loadAdminKey,
  fetchSponsorsByAtsType,
  tsImportBatch,
  expireStaleJobs,
  updateSponsorJobCount,
  parseSalary,
  makeJobId,
  resolveCareersPage,
} from "./utils.mjs";

const SCRAPE_TIMEOUT_MS = 20_000;
const BATCH_SIZE = 100;
const PAGE_LIMIT = 20;

/**
 * Extract tenant + board from a Workday careers URL.
 * Returns { baseUrl, tenant, board } or null.
 */
function parseWorkdayUrl(careersUrl) {
  if (!careersUrl) return null;
  try {
    const url = new URL(careersUrl);
    const host = url.hostname; // e.g. "google.wd3.myworkdayjobs.com"

    // Pattern A: {tenant}.wd{N}.myworkdayjobs.com/{board}
    const patA = host.match(/^(.+?)\.(wd\d+)\.myworkdayjobs\.com$/);
    if (patA) {
      const tenant = patA[1];
      const wdNum = patA[2];
      // board is first path segment
      const board = url.pathname.replace(/^\//, "").split("/")[0] || tenant;
      return {
        baseUrl: `https://${host}`,
        apiUrl:  `https://${host}/wday/cxs/${tenant}/${board}/jobs`,
        tenant,
        board,
      };
    }

    // Pattern B: {company}.myworkdayjobs.com/{tenant}/{board}
    const patB = host.match(/^(.+?)\.myworkdayjobs\.com$/);
    if (patB) {
      const parts = url.pathname.replace(/^\//, "").split("/");
      const tenant = parts[0] || patB[1];
      const board = parts[1] || tenant;
      return {
        baseUrl: `https://${host}`,
        apiUrl:  `https://${host}/wday/cxs/${tenant}/${board}/jobs`,
        tenant,
        board,
      };
    }
  } catch {}
  return null;
}

async function fetchWorkdayPage(apiUrl, offset) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SponsorMap/1.0 (+https://sponsormap.engtx.co.uk)",
      "Accept": "application/json",
    },
    body: JSON.stringify({ limit: PAGE_LIMIT, offset, searchText: "" }),
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Workday API ${res.status}`);
  return res.json();
}

async function fetchAllWorkdayJobs(apiUrl) {
  const allJobs = [];
  let offset = 0;

  while (true) {
    const data = await fetchWorkdayPage(apiUrl, offset);
    const jobs = data.jobPostings || data.jobs || [];
    if (!jobs.length) break;
    allJobs.push(...jobs);
    const total = data.total ?? data.totalJobPostings ?? jobs.length;
    offset += jobs.length;
    if (offset >= total || jobs.length < PAGE_LIMIT) break;
  }

  return allJobs;
}

async function resolveWorkdayConfig(careersUrl) {
  const direct = parseWorkdayUrl(careersUrl);
  if (direct) return direct;

  // Try following redirects / scraping page for myworkdayjobs.com URLs
  const { finalUrl, html } = await resolveCareersPage(careersUrl);
  const fromFinal = parseWorkdayUrl(finalUrl);
  if (fromFinal) return fromFinal;

  // Look for myworkdayjobs.com links in HTML
  const m = html.match(/https?:\/\/([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]*myworkdayjobs\.com[^"'\s>]*)/);
  if (m) return parseWorkdayUrl(m[0]);

  return null;
}

async function scrapeOneSponsor(sponsor, adminKey) {
  const parsed = await resolveWorkdayConfig(sponsor.careersUrl);
  if (!parsed) {
    console.warn(`  [${sponsor.slug}] Cannot parse Workday URL: ${sponsor.careersUrl}`);
    return 0;
  }

  let wdJobs;
  try {
    wdJobs = await fetchAllWorkdayJobs(parsed.apiUrl);
  } catch (err) {
    console.warn(`  [${sponsor.slug}] Workday fetch failed: ${err.message}`);
    return 0;
  }

  const now = new Date().toISOString();
  const liveIds = new Set();
  const docs = [];

  for (const job of wdJobs) {
    const atsId = job.bulletFields?.[0] || job.externalPath || job.title;
    if (!atsId || !job.title) continue;
    const jobId = makeJobId(sponsor.slug, atsId);
    liveIds.add(jobId);

    const location = Array.isArray(job.locationsText)
      ? job.locationsText.join(", ")
      : (job.locationsText || job.location || "");

    const salary = job.salary || "";
    const { salaryMin, salaryMax } = parseSalary(salary);

    const jobUrl = job.externalPath
      ? `${parsed.baseUrl}${job.externalPath}`
      : (job.absoluteUrl || sponsor.careersUrl);

    docs.push({
      id:            jobId,
      sponsorSlug:   sponsor.slug,
      sponsorName:   sponsor.name || "",
      title:         job.title,
      location,
      salary,
      salaryMin,
      salaryMax,
      sector:        sponsor.sector || "",
      region:        sponsor.region || "",
      atsType:       "Workday",
      careersUrl:    jobUrl,
      postedAt:      job.postedOn ? new Date(job.postedOn).toISOString() : now,
      scrapedAt:     now,
      status:        "active",
      sponsorRating: sponsor.rating || "",
      route:         sponsor.primaryRoute || "",
    });
  }

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await tsImportBatch(docs.slice(i, i + BATCH_SIZE), adminKey);
  }

  await expireStaleJobs(sponsor.slug, liveIds, adminKey);
  await updateSponsorJobCount(sponsor.slug, docs.length, adminKey);

  return docs.length;
}

export async function handler(event) {
  const adminKey = await loadAdminKey();

  if (event?.Records?.length) {
    let total = 0;
    for (const record of event.Records) {
      const { sponsorSlug, careersUrl, ...rest } = JSON.parse(record.body);
      const sponsor = { slug: sponsorSlug, careersUrl, ...rest };
      const count = await scrapeOneSponsor(sponsor, adminKey);
      console.log(`[Workday] ${sponsorSlug}: ${count} jobs`);
      total += count;
    }
    return { statusCode: 200, body: `Scraped ${total} jobs` };
  }

  console.log("[Workday] Batch mode: fetching all Workday sponsors...");
  const sponsors = await fetchSponsorsByAtsType("Workday", adminKey);
  console.log(`Found ${sponsors.length} Workday sponsors`);

  let total = 0;
  for (const sponsor of sponsors) {
    const count = await scrapeOneSponsor(sponsor, adminKey);
    console.log(`  ${sponsor.slug}: ${count} jobs`);
    total += count;
  }

  console.log(`[Workday] Done. Total jobs: ${total}`);
  return { statusCode: 200, body: `Scraped ${total} jobs from ${sponsors.length} sponsors` };
}
