// Vercel serverless — ESM
// Searches the Typesense jobs collection with filters and pagination.

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 60;

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
  const q           = String(raw.q           || "").slice(0, 100);
  const sector      = String(raw.sector      || "").slice(0, 200);
  const region      = String(raw.region      || "").slice(0, 50);
  const location    = String(raw.location    || "").slice(0, 100);
  const route       = String(raw.route       || "");
  const sponsorSlug = String(raw.sponsorSlug || "").slice(0, 100);
  const atsType     = String(raw.atsType     || "").slice(0, 50);
  const salaryMin   = parseInt(raw.salaryMin, 10) || 0;

  const pageNum    = Math.min(1000, Math.max(1, parseInt(raw.page,    10) || 1));
  const perPageNum = Math.min(  25, Math.max(1, parseInt(raw.perPage, 10) || 10));

  const host   = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;

  if (!host || !apiKey) {
    return res.status(500).json({ error: "Search service not configured" });
  }

  const filterParts = ["status:=active"];

  if (sector) {
    const sectors = sector.split(",").map(s => s.trim()).filter(Boolean);
    if (sectors.length === 1) filterParts.push(`sector:=${sectors[0]}`);
    else if (sectors.length > 1) filterParts.push(`sector:=[${sectors.join(", ")}]`);
  }
  if (region)      filterParts.push(`region:=${region}`);
  if (location)    filterParts.push(`location:=${location}`);
  if (route)       filterParts.push(`route:=${route}`);
  if (sponsorSlug) filterParts.push(`sponsorSlug:=${sponsorSlug}`);
  if (atsType)     filterParts.push(`atsType:=${atsType}`);
  if (salaryMin > 0) filterParts.push(`salaryMin:>=${salaryMin}`);

  const searchParams = {
    q:        q || "*",
    query_by: "title,sponsorName,location",
    page:     String(pageNum),
    per_page: String(perPageNum),
    sort_by:  "scrapedAt:desc",
    filter_by: filterParts.join(" && "),
  };

  const params = new URLSearchParams(searchParams);
  const url = `https://${host}/collections/jobs/documents/search?${params}`;

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
      id:            hit.document.id,
      sponsorSlug:   hit.document.sponsorSlug,
      sponsorName:   hit.document.sponsorName,
      title:         hit.document.title,
      location:      hit.document.location || "",
      salary:        hit.document.salary || "",
      salaryMin:     hit.document.salaryMin || 0,
      salaryMax:     hit.document.salaryMax || 0,
      sector:        hit.document.sector || "",
      region:        hit.document.region || "",
      atsType:       hit.document.atsType || "",
      careersUrl:    hit.document.careersUrl,
      postedAt:      hit.document.postedAt || "",
      scrapedAt:     hit.document.scrapedAt,
      status:        hit.document.status,
      sponsorRating: hit.document.sponsorRating || "",
      route:         hit.document.route || "",
    }));

    const total = data.found || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPageNum));

    return res.status(200).json({ results, total, page: pageNum, perPage: perPageNum, totalPages });
  } catch (err) {
    console.error("Jobs search failed:", err.message);
    return res.status(500).json({ error: "Search request failed" });
  }
}
