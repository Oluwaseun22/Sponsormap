import { NextRequest, NextResponse } from "next/server";
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
});

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 60;

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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.ip ?? "unknown";
  const now = Date.now();
  const record = rateLimitMap.get(ip) ?? { count: 0, windowStart: now };
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    record.count = 0;
    record.windowStart = now;
  }
  record.count++;
  rateLimitMap.set(ip, record);
  if (record.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429 }
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

    posthog.capture({
      distinctId: ip,
      event: "sponsor_search",
      properties: { query: q, sector: sector || null, town: town || null, region: region || null, route: route || null, rating: rating || null, results_count: total, page: pageNum },
    });

    return NextResponse.json({ results, total, page: pageNum, perPage: perPageNum, totalPages });
  } catch (err) {
    const error = err as Error;
    console.error("Search fetch failed:", error.message);
    return NextResponse.json({ error: "Search request failed" }, { status: 500 });
  }
}
