/**
 * Greenhouse job scraper Lambda.
 *
 * Reads sponsors with atsType=Greenhouse, fetches jobs from the public
 * Greenhouse Jobs API, upserts into Typesense jobs collection.
 *
 * Can be invoked directly (Lambda handler) or via SQS message:
 *   { sponsorSlug, atsType, careersUrl }
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

const SCRAPE_TIMEOUT_MS = 15_000;
const BATCH_SIZE = 100;

function extractBoardTokenFromUrl(urlStr) {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr);
    if (url.hostname === "boards.greenhouse.io") {
      const parts = url.pathname.replace(/^\//, "").split("/");
      return parts[0] || null;
    }
    if (url.hostname.endsWith(".greenhouse.io")) {
      return url.hostname.split(".greenhouse.io")[0] || null;
    }
  } catch {}
  const m = urlStr.match(/greenhouse\.io\/(?:embed\/job_board\?for=)?([a-zA-Z0-9_-]+)/);
  if (m && !GH_SKIP_TOKENS.has(m[1])) return m[1];
  return null;
}

const GH_SKIP_TOKENS = new Set(["embed", "job_board", "jobs", "api", "v1"]);

function extractBoardTokenFromHtml(html) {
  const patterns = [
    /boards\.greenhouse\.io\/embed\/job_board\?for=([a-zA-Z0-9_-]+)/,
    /boards\.greenhouse\.io\/([a-zA-Z0-9_-]+)/,
    /Grnhse\.setup\(['"]([a-zA-Z0-9_-]+)['"]\)/,
    /gh_jid['""]?\s*[:=]\s*['"]([a-zA-Z0-9_-]+)/,
    /"token":\s*"([a-zA-Z0-9_-]+)"/,
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m && !GH_SKIP_TOKENS.has(m[1])) return m[1];
  }
  return null;
}

async function resolveGreenhouseToken(careersUrl) {
  // 1. Try direct URL
  const direct = extractBoardTokenFromUrl(careersUrl);
  if (direct) return direct;

  // 2. Fetch page and try final URL + HTML
  const { finalUrl, html } = await resolveCareersPage(careersUrl);
  const fromFinalUrl = extractBoardTokenFromUrl(finalUrl);
  if (fromFinalUrl) return fromFinalUrl;

  return extractBoardTokenFromHtml(html);
}

async function fetchGreenhouseJobs(token) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "SponsorMap/1.0 (+https://sponsormap.engtx.co.uk)" },
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Greenhouse API ${res.status} for token ${token}`);
  const data = await res.json();
  return data.jobs || [];
}

async function scrapeOneSponsor(sponsor, adminKey) {
  const token = await resolveGreenhouseToken(sponsor.careersUrl);
  if (!token) {
    console.warn(`  [${sponsor.slug}] Cannot resolve Greenhouse token from: ${sponsor.careersUrl}`);
    return 0;
  }

  let ghJobs;
  try {
    ghJobs = await fetchGreenhouseJobs(token);
  } catch (err) {
    console.warn(`  [${sponsor.slug}] Greenhouse fetch failed: ${err.message}`);
    return 0;
  }

  const now = new Date().toISOString();
  const liveIds = new Set();
  const docs = [];

  for (const job of ghJobs) {
    if (!job.id || !job.title) continue;
    const jobId = makeJobId(sponsor.slug, job.id);
    liveIds.add(jobId);

    const location = Array.isArray(job.location)
      ? job.location.map(l => l.name).join(", ")
      : (job.location?.name || "");

    const salary = job.salary_range
      ? `£${job.salary_range.min_salary}–£${job.salary_range.max_salary}`
      : "";
    const { salaryMin, salaryMax } = parseSalary(salary);

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
      atsType:       "Greenhouse",
      careersUrl:    job.absolute_url || sponsor.careersUrl,
      postedAt:      job.updated_at ? new Date(job.updated_at).toISOString() : now,
      scrapedAt:     now,
      status:        "active",
      sponsorRating: sponsor.rating || "",
      route:         sponsor.primaryRoute || "",
    });
  }

  // Upsert in batches
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await tsImportBatch(docs.slice(i, i + BATCH_SIZE), adminKey);
  }

  await expireStaleJobs(sponsor.slug, liveIds, adminKey);
  await updateSponsorJobCount(sponsor.slug, docs.length, adminKey);

  return docs.length;
}

export async function handler(event) {
  const adminKey = await loadAdminKey();

  // SQS trigger: single sponsor per message
  if (event?.Records?.length) {
    let total = 0;
    for (const record of event.Records) {
      const { sponsorSlug, careersUrl, ...rest } = JSON.parse(record.body);
      const sponsor = { slug: sponsorSlug, careersUrl, ...rest };
      const count = await scrapeOneSponsor(sponsor, adminKey);
      console.log(`[Greenhouse] ${sponsorSlug}: ${count} jobs`);
      total += count;
    }
    return { statusCode: 200, body: `Scraped ${total} jobs` };
  }

  // Batch mode: scrape all Greenhouse sponsors
  console.log("[Greenhouse] Batch mode: fetching all Greenhouse sponsors...");
  const sponsors = await fetchSponsorsByAtsType("Greenhouse", adminKey);
  console.log(`Found ${sponsors.length} Greenhouse sponsors`);

  let total = 0;
  for (const sponsor of sponsors) {
    const count = await scrapeOneSponsor(sponsor, adminKey);
    console.log(`  ${sponsor.slug}: ${count} jobs`);
    total += count;
  }

  console.log(`[Greenhouse] Done. Total jobs: ${total}`);
  return { statusCode: 200, body: `Scraped ${total} jobs from ${sponsors.length} sponsors` };
}
