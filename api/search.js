// Vercel serverless — CommonJS
// Queries Typesense and returns paginated sponsor results.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const {
    q = "",
    sector = "",
    town = "",
    region = "",
    route = "",
    rating = "",
    status = "",
    page = "1",
    perPage = "10",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPageNum = Math.min(50, Math.max(1, parseInt(perPage, 10) || 10));

  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;

  if (!host || !apiKey) {
    return res.status(500).json({ error: "Search service not configured" });
  }

  const filterParts = [];
  const sectorList = sector ? sector.split(",").map(s => s.trim()).filter(Boolean) : [];
  if (sectorList.length === 1) filterParts.push(`sector:=${sectorList[0]}`);
  else if (sectorList.length > 1) filterParts.push(`sector:=[${sectorList.join(", ")}]`);
  if (town)   filterParts.push(`town:=${town}`);
  if (region) filterParts.push(`region:=${region}`);
  if (route)  filterParts.push(`primaryRoute:=${route}`);
  if (rating) filterParts.push(`rating:=${rating}`);
  if (status) filterParts.push(`status:=${status}`);

  const searchParams = {
    q:            q || "*",
    query_by:     "name,town,county",
    page:         String(pageNum),
    per_page:     String(perPageNum),
  };
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
      id:           hit.document.slug,
      name:         hit.document.name,
      slug:         hit.document.slug,
      town:         hit.document.town || "",
      county:       hit.document.county || "",
      region:       hit.document.region || "",
      sector:       hit.document.sector || "",
      rating:       hit.document.rating || "",
      route:        hit.document.primaryRoute || "",
      status:       hit.document.status || "",
    }));

    const total = data.found || 0;
    const totalPages = Math.max(1, Math.ceil(total / perPageNum));

    return res.status(200).json({ results, total, page: pageNum, perPage: perPageNum, totalPages });
  } catch (err) {
    console.error("Search fetch failed:", err.message);
    return res.status(500).json({ error: "Search request failed" });
  }
};
