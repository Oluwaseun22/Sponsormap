// AUDIT FIX [6.8/7.2]: rate limit now backed by Upstash Redis (was in-memory Map — useless on serverless).
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp, rateLimitHeaders } from "@/lib/rate-limit";

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SEC = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://sponsormap.engtx.co.uk",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit({
    id: ip,
    scope: "search",
    max: RATE_LIMIT_MAX,
    windowSeconds: RATE_LIMIT_WINDOW_SEC,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").slice(0, 100);
  const sector = (searchParams.get("sector") ?? "").slice(0, 200);
  const town = (searchParams.get("town") ?? "").slice(0, 100);
  const region = (searchParams.get("region") ?? "").slice(0, 50);
  const route = searchParams.get("route") ?? "";
  const rating = searchParams.get("rating") ?? "";
  const status = searchParams.get("status") ?? "";
  const pageNum = Math.min(1000, Math.max(1, parseInt(searchParams.get("page") ?? "1", 10)));
  const perPageNum = Math.min(25, Math.max(1, parseInt(searchParams.get("perPage") ?? "10", 10)));

  const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST;
  const apiKey = process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY;
  if (!host || !apiKey) {
    return NextResponse.json({ error: "Search service not configured" }, { status: 500 });
  }

  const filterParts: string[] = [];
  const sectorList = sector ? sector.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (sectorList.length === 1) filterParts.push(`sector:=${sectorList[0]}`);
  else if (sectorList.length > 1) filterParts.push(`sector:=[${sectorList.join(", ")}]`);
  if (town) filterParts.push(`town:=${town}`);
  if (region) filterParts.push(`region:=${region}`);
  if (route) filterParts.push(`routes:=${route}`);
  if (rating) filterParts.push(`rating:=${rating}`);
  if (status) filterParts.push(`status:=${status}`);

  const tsParams: Record<string, string> = {
    q: q || "*",
    query_by: "name,town,county",
    page: String(pageNum),
    per_page: String(perPageNum),
  };
  const filterStr = filterParts.join(" && ");
  if (filterStr) tsParams.filter_by = filterStr;

  const url = `https://${host}/collections/sponsors/documents/search?${new URLSearchParams(tsParams)}`;

  try {
    const tsRes = await fetch(url, { headers: { "X-TYPESENSE-API-KEY": apiKey } });
    if (!tsRes.ok) {
      const body = await tsRes.text();
      console.error("Typesense error", tsRes.status, body);
      return NextResponse.json({ error: "Search backend error" }, { status: 502 });
    }
    const data = await tsRes.json();

    const results = (data.hits ?? []).map((hit: { document: Record<string, unknown> }) => ({
      id: hit.document.slug,
      name: hit.document.name,
      slug: hit.document.slug,
      town: hit.document.town ?? "",
      county: hit.document.county ?? "",
      region: hit.document.region ?? "",
      sector: hit.document.sector ?? "",
      rating: hit.document.rating ?? "",
      route: hit.document.primaryRoute ?? "",
      routes: hit.document.routes ?? [],
      status: hit.document.status ?? "",
      atsType: hit.document.atsType ?? "",
      careersUrl: hit.document.careersUrl ?? "",
      fingerprintStatus: hit.document.fingerprintStatus ?? "",
      jobCount: hit.document.jobCount ?? 0,
    }));

    const total = data.found ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / perPageNum));

    return NextResponse.json({ results, total, page: pageNum, perPage: perPageNum, totalPages });
  } catch (err) {
    const error = err as Error;
    console.error("Search fetch failed:", error.message);
    return NextResponse.json({ error: "Search request failed" }, { status: 500 });
  }
}
