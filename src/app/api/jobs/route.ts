import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
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
    return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").slice(0, 100);
  const sector = (searchParams.get("sector") ?? "").slice(0, 200);
  const region = (searchParams.get("region") ?? "").slice(0, 50);
  const location = (searchParams.get("location") ?? "").slice(0, 100);
  const route = searchParams.get("route") ?? "";
  const sponsorSlug = (searchParams.get("sponsorSlug") ?? "").slice(0, 100);
  const atsType = (searchParams.get("atsType") ?? "").slice(0, 50);
  const salaryMin = parseInt(searchParams.get("salaryMin") ?? "0", 10) || 0;
  const pageNum = Math.min(1000, Math.max(1, parseInt(searchParams.get("page") ?? "1", 10)));
  const perPageNum = Math.min(25, Math.max(1, parseInt(searchParams.get("perPage") ?? "10", 10)));

  const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST;
  const apiKey = process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY;
  if (!host || !apiKey) {
    return NextResponse.json({ error: "Search service not configured" }, { status: 500 });
  }

  const filterParts = ["status:=active"];
  if (sector) {
    const sectors = sector.split(",").map((s) => s.trim()).filter(Boolean);
    if (sectors.length === 1) filterParts.push(`sector:=${sectors[0]}`);
    else if (sectors.length > 1) filterParts.push(`sector:=[${sectors.join(", ")}]`);
  }
  if (region) filterParts.push(`region:=${region}`);
  if (location) filterParts.push(`location:=${location}`);
  if (route) filterParts.push(`route:=${route}`);
  if (sponsorSlug) filterParts.push(`sponsorSlug:=${sponsorSlug}`);
  if (atsType) filterParts.push(`atsType:=${atsType}`);
  if (salaryMin > 0) filterParts.push(`salaryMin:>=${salaryMin}`);

  const tsParams: Record<string, string> = {
    q: q || "*",
    query_by: "title,sponsorName,location",
    page: String(pageNum),
    per_page: String(perPageNum),
    sort_by: "scrapedAt:desc",
    filter_by: filterParts.join(" && "),
  };

  const url = `https://${host}/collections/jobs/documents/search?${new URLSearchParams(tsParams)}`;

  try {
    const tsRes = await fetch(url, { headers: { "X-TYPESENSE-API-KEY": apiKey } });
    if (!tsRes.ok) {
      console.error("Typesense error", tsRes.status, await tsRes.text());
      return NextResponse.json({ error: "Search backend error" }, { status: 502 });
    }
    const data = await tsRes.json();

    const results = (data.hits ?? []).map((hit: { document: Record<string, unknown> }) => ({
      id: hit.document.id,
      sponsorSlug: hit.document.sponsorSlug,
      sponsorName: hit.document.sponsorName,
      title: hit.document.title,
      location: hit.document.location ?? "",
      salary: hit.document.salary ?? "",
      salaryMin: hit.document.salaryMin ?? 0,
      salaryMax: hit.document.salaryMax ?? 0,
      sector: hit.document.sector ?? "",
      region: hit.document.region ?? "",
      atsType: hit.document.atsType ?? "",
      careersUrl: hit.document.careersUrl,
      postedAt: hit.document.postedAt ?? "",
      scrapedAt: hit.document.scrapedAt,
      status: hit.document.status,
      sponsorRating: hit.document.sponsorRating ?? "",
      route: hit.document.route ?? "",
    }));

    const total = data.found ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / perPageNum));
    return NextResponse.json({ results, total, page: pageNum, perPage: perPageNum, totalPages });
  } catch (err) {
    console.error("Jobs search failed:", (err as Error).message);
    return NextResponse.json({ error: "Search request failed" }, { status: 500 });
  }
}
