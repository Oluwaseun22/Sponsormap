/**
 * Ashby job scraper Lambda.
 *
 * Reads sponsors with atsType=Ashby, fetches jobs from the public
 * Ashby Posting API, upserts into Typesense jobs collection.
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

function extractAshbySlugFromUrl(urlStr) {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr);
    if (url.hostname === "jobs.ashbyhq.com") {
      return url.pathname.replace(/^\//, "").split("/")[0] || null;
    }
  } catch {}
  const m = urlStr.match(/ashbyhq\.com\/([a-zA-Z0-9_.-]+)/);
  return m ? m[1] : null;
}

async function resolveAshbySlug(careersUrl) {
  const direct = extractAshbySlugFromUrl(careersUrl);
  if (direct) return direct;

  const { finalUrl, html } = await resolveCareersPage(careersUrl);
  const fromFinal = extractAshbySlugFromUrl(finalUrl);
  if (fromFinal) return fromFinal;

  const m = html.match(/ashbyhq\.com\/([a-zA-Z0-9_.-]+)/);
  return m ? m[1] : null;
}

async function fetchAshbyJobs(slug) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SponsorMap/1.0 (+https://sponsormap.engtx.co.uk)",
    },
    body: JSON.stringify({ includeCompensation: true }),
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ashby API ${res.status} for slug ${slug}`);
  const data = await res.json();
  return data.jobs || [];
}

async function scrapeOneSponsor(sponsor, adminKey) {
  const slug = await resolveAshbySlug(sponsor.careersUrl);
  if (!slug) {
    console.warn(`  [${sponsor.slug}] Cannot resolve Ashby slug from: ${sponsor.careersUrl}`);
    return 0;
  }

  let ashbyJobs;
  try {
    ashbyJobs = await fetchAshbyJobs(slug);
  } catch (err) {
    console.warn(`  [${sponsor.slug}] Ashby fetch failed: ${err.message}`);
    return 0;
  }

  const now = new Date().toISOString();
  const liveIds = new Set();
  const docs = [];

  for (const job of ashbyJobs) {
    if (!job.id || !job.title) continue;
    const jobId = makeJobId(sponsor.slug, job.id);
    liveIds.add(jobId);

    const location = Array.isArray(job.location)
      ? job.location.join(", ")
      : (job.location || job.locationName || "");

    const salary = job.compensationTierSummary || "";
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
      atsType:       "Ashby",
      careersUrl:    job.jobUrl || job.applyUrl || sponsor.careersUrl,
      postedAt:      job.publishedDate ? new Date(job.publishedDate).toISOString() : now,
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
      console.log(`[Ashby] ${sponsorSlug}: ${count} jobs`);
      total += count;
    }
    return { statusCode: 200, body: `Scraped ${total} jobs` };
  }

  console.log("[Ashby] Batch mode: fetching all Ashby sponsors...");
  const sponsors = await fetchSponsorsByAtsType("Ashby", adminKey);
  console.log(`Found ${sponsors.length} Ashby sponsors`);

  let total = 0;
  for (const sponsor of sponsors) {
    const count = await scrapeOneSponsor(sponsor, adminKey);
    console.log(`  ${sponsor.slug}: ${count} jobs`);
    total += count;
  }

  console.log(`[Ashby] Done. Total jobs: ${total}`);
  return { statusCode: 200, body: `Scraped ${total} jobs from ${sponsors.length} sponsors` };
}
