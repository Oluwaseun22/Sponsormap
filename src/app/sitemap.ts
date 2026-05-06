import { MetadataRoute } from "next";

const BASE = "https://sponsormap.engtx.co.uk";

async function fetchTopSlugs(): Promise<string[]> {
  const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_SEARCH_ONLY_KEY;
  if (!host || !apiKey) return [];

  const slugs: string[] = [];
  try {
    // Fetch top 10k by jobCount desc, 250 per page = 40 pages
    for (let page = 1; page <= 40; page++) {
      const url = `https://${host}/collections/sponsors/documents/search?${new URLSearchParams({
        q: "*",
        query_by: "name",
        sort_by: "jobCount:desc",
        per_page: "250",
        page: String(page),
      })}`;
      const res = await fetch(url, { headers: { "X-TYPESENSE-API-KEY": apiKey } });
      if (!res.ok) break;
      const data = await res.json();
      const hits = data.hits ?? [];
      if (hits.length === 0) break;
      for (const hit of hits) {
        if (hit.document.slug) slugs.push(hit.document.slug);
      }
      if (hits.length < 250) break;
    }
  } catch {}
  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await fetchTopSlugs();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const sponsorRoutes: MetadataRoute.Sitemap = slugs.map(slug => ({
    url: `${BASE}/sponsors/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...sponsorRoutes];
}
