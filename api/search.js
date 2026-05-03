// Vercel serverless — ESM
// Queries Typesense and returns paginated sponsor results.

import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
  host: process.env.POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
  enableExceptionAutocapture: true,
});

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX    = 60;

// Slugs for well-known companies, in priority order (HSBC first, etc.)
// Non-existent slugs are silently ignored by Typesense pinned_hits.
const PROMINENT_SLUGS = [
  "hsbc-holdings-plc",
  "google-uk-limited",
  "amazon-uk-services-ltd",
  "microsoft-limited",
  "deloitte-llp",
  "pricewaterhousecoopers-llp",
  "kpmg-llp",
  "ernst-young-llp",
  "barclays-bank-uk-plc",
  "lloyds-bank-plc",
  "british-broadcasting-corporation",
  "goldman-sachs-international",
  "jpmorgan-chase-bank-national-association",
  "meta-platforms-ireland-limited",
  "apple-distribution-international-limited",
  "ibm-united-kingdom-limited",
  "accenture-uk-limited",
  "mckinsey-company-united-kingdom",
  "boston-consulting-group-uk-llp",
  "hsbc-bank-plc",
  "nhs-commissioning-board",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://sponsormap.engtx.co.uk");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  if (now - record.windowStart > RATE_LIMIT_WINDOW) { record.count = 0; record.windowStart = now; }
  record.count++;
  rateLimitMap.set(ip, record);
  if (record.count > RATE_LIMIT_MAX) return res.status(429).json({ error: "Too many requests. Please wait." });

  const raw = req.query;
  const q       = String(raw.q      || "").slice(0, 100);
  const sector  = String(raw.sector || "").slice(0, 200);
  const town    = String(raw.town   || "").slice(0, 100);
  const region  = String(raw.region || "").slice(0, 50);
  const route   = String(raw.route  || "");
  const rating  = String(raw.rating || "");
  const status  = String(raw.status || "");

  const pageNum    = Math.min(1000, Math.max(1, parseInt(raw.page,    10) || 1));
  const perPageNum = Math.min(  25, Math.max(1, parseInt(raw.perPage, 10) || 10));

  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;

  if (!host || !apiKey) {
    return res.status(500).json({ error: "Search service not configured" });
  }

  // Default view: no query, no explicit location → show London sponsors with prominent companies first
  const isDefaultView = !q && !town && !region;

  const filterParts = [];
  const sectorList = sector ? sector.split(",").map(s => s.trim()).filter(Boolean) : [];
  if (sectorList.length === 1) filterParts.push(`sector:=${sectorList[0]}`);
  else if (sectorList.length > 1) filterParts.push(`sector:=[${sectorList.join(", ")}]`);
  if (isDefaultView) filterParts.push("town:=London");
  else if (town)   filterParts.push(`town:=${town}`);
  if (region) filterParts.push(`region:=${region}`);
  if (route)  filterParts.push(`routes:=${route}`);
  if (rating) filterParts.push(`rating:=${rating}`);
  if (status) filterParts.push(`status:=${status}`);

  const searchParams = {
    q:            q || "*",
    query_by:     "name,town,county",
    page:         String(pageNum),
    per_page:     String(perPageNum),
  };

  if (!q) {
    // Alphabetical sort when browsing without a search query
    searchParams.sort_by = "name:asc";
  }

  if (isDefaultView) {
    // Pin well-known companies to the top of the first pages; Typesense ignores any slug that doesn't exist
    searchParams.pinned_hits = PROMINENT_SLUGS.map((slug, i) => `${slug}:${i + 1}`).join(",");
  }

  const filterStr = filterParts.join(" && ");
  if (filterStr) searchParams.filter_by = filterStr;

  const params = new URLSearchParams(searchParams);

  const url = `https://${host}/collections/sponsors/documents/search?${params}`;

  try {
    const tsRes = await fetch(url, {
      headers: { "X-TYPESENSE-API-KEY": apiKey },
    });

    if (!tsRes.ok) {
      const body = await tsRes.text();
      console.error("Typesense error", tsRes.status, body);
      return res.status(502).json({ error: "Search backend error" });
    }

    const data = await tsRes.json();

    const results = (data.hits || []).map(hit => ({
      id:                hit.document.slug,
      name:              hit.document.name,
      slug:              hit.document.slug,
      town:              hit.document.town || "",
      county:            hit.document.county || "",
      region:            hit.document.region || "",
      sector:            hit.document.sector || "",
      rating:            hit.document.rating || "",
      route:             hit.document.primaryRoute || "",
      routes:            hit.document.routes || [],
      status:            hit.document.status || "",
      atsType:           hit.document.atsType || "",
      careersUrl:        hit.document.careersUrl || "",
      fingerprintStatus: hit.document.fingerprintStatus || "",
      jobCount:          hit.document.jobCount || 0,
    }));

    const total = data.found || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPageNum));

    posthog.capture({
      distinctId: ip,
      event: "sponsor_search",
      properties: {
        query: q,
        sector: sector || null,
        town: town || null,
        region: region || null,
        route: route || null,
        rating: rating || null,
        results_count: total,
        page: pageNum,
      },
    });

    return res.status(200).json({ results, total, page: pageNum, perPage: perPageNum, totalPages });
  } catch (err) {
    console.error("Search fetch failed:", err.message);
    posthog.captureException(err, ip);
    return res.status(500).json({ error: "Search request failed" });
  }
};
