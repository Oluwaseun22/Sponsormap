/**
 * Lever job scraper Lambda.
 *
 * Reads sponsors with atsType=Lever, fetches jobs from the public
 * Lever Postings API, upserts into Typesense jobs collection.
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

function extractLeverSlugFromUrl(urlStr) {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr);
    if (url.hostname === "jobs.lever.co" || url.hostname === "apply.lever.co") {
      return url.pathname.replace(/^\//, "").split("/")[0] || null;
    }
  } catch {}
  const m = urlStr.match(/(?:jobs|apply)\.lever\.co\/([^/?#]+)/);
  return m ? m[1] : null;
}

async function resolveLeverSlug(careersUrl) {
  const direct = extractLeverSlugFromUrl(careersUrl);
  if (direct) return direct;

  const { finalUrl, html } = await resolveCareersPage(careersUrl);
  const fromFinal = extractLeverSlugFromUrl(finalUrl);
  if (fromFinal) return fromFinal;

  // Parse HTML for lever links
  const m = html.match(/jobs\.lever\.co\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function fetchLeverJobs(slug) {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "SponsorMap/1.0 (+https://sponsormap.engtx.co.uk)" },
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Lever API ${res.status} for slug ${slug}`);
  return res.json();
}

async function scrapeOneSponsor(sponsor, adminKey) {
  const slug = await resolveLeverSlug(sponsor.careersUrl);
  if (!slug) {
    console.warn(`  [${sponsor.slug}] Cannot resolve Lever slug from: ${sponsor.careersUrl}`);
    return 0;
  }

  let postings;
  try {
    postings = await fetchLeverJobs(slug);
  } catch (err) {
    console.warn(`  [${sponsor.slug}] Lever fetch failed: ${err.message}`);
    return 0;
  }

  if (!Array.isArray(postings)) {
    console.warn(`  [${sponsor.slug}] Unexpected Lever response`);
    return 0;
  }

  const now = new Date().toISOString();
  const liveIds = new Set();
  const docs = [];

  for (const posting of postings) {
    if (!posting.id || !posting.text) continue;
    const jobId = makeJobId(sponsor.slug, posting.id);
    liveIds.add(jobId);

    const location = posting.categories?.location || posting.categories?.allLocations?.join(", ") || "";
    const salary = posting.salaryRange
      ? `£${posting.salaryRange.min}–£${posting.salaryRange.max}`
      : "";
    const { salaryMin, salaryMax } = parseSalary(salary);

    docs.push({
      id:            jobId,
      sponsorSlug:   sponsor.slug,
      sponsorName:   sponsor.name || "",
      title:         posting.text,
      location,
      salary,
      salaryMin,
      salaryMax,
      sector:        sponsor.sector || "",
      region:        sponsor.region || "",
      atsType:       "Lever",
      careersUrl:    posting.hostedUrl || sponsor.careersUrl,
      postedAt:      posting.createdAt ? new Date(posting.createdAt).toISOString() : now,
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
      console.log(`[Lever] ${sponsorSlug}: ${count} jobs`);
      total += count;
    }
    return { statusCode: 200, body: `Scraped ${total} jobs` };
  }

  console.log("[Lever] Batch mode: fetching all Lever sponsors...");
  const sponsors = await fetchSponsorsByAtsType("Lever", adminKey);
  console.log(`Found ${sponsors.length} Lever sponsors`);

  let total = 0;
  for (const sponsor of sponsors) {
    const count = await scrapeOneSponsor(sponsor, adminKey);
    console.log(`  ${sponsor.slug}: ${count} jobs`);
    total += count;
  }

  console.log(`[Lever] Done. Total jobs: ${total}`);
  return { statusCode: 200, body: `Scraped ${total} jobs from ${sponsors.length} sponsors` };
}
