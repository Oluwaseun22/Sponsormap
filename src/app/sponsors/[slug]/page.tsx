import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const revalidate = 86400; // ISR: revalidate daily

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  town: string;
  county: string;
  region: string;
  sector: string;
  rating: string;
  route: string;
  routes: string[];
  status: string;
  atsType: string;
  careersUrl: string;
  jobCount: number;
}

async function fetchSponsor(slug: string): Promise<Sponsor | null> {
  const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_ADMIN_KEY;
  if (!host || !apiKey) return null;

  try {
    const url = `https://${host}/collections/sponsors/documents/search?${new URLSearchParams({
      q: "*",
      query_by: "name",
      filter_by: `slug:=${slug}`,
      per_page: "1",
    })}`;
    const res = await fetch(url, {
      headers: { "X-TYPESENSE-API-KEY": apiKey },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data.hits?.[0]?.document;
    if (!doc) return null;
    return {
      id: doc.slug,
      name: doc.name,
      slug: doc.slug,
      town: doc.town ?? "",
      county: doc.county ?? "",
      region: doc.region ?? "",
      sector: doc.sector ?? "",
      rating: doc.rating ?? "",
      route: doc.primaryRoute ?? "",
      routes: doc.routes ?? [],
      status: doc.status ?? "",
      atsType: doc.atsType ?? "",
      careersUrl: doc.careersUrl ?? "",
      jobCount: doc.jobCount ?? 0,
    };
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const host = process.env.NEXT_PUBLIC_TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_ADMIN_KEY;
  if (!host || !apiKey) return [];

  const slugs: { slug: string }[] = [];
  try {
    const url = `https://${host}/collections/sponsors/documents/search?${new URLSearchParams({
      q: "*",
      query_by: "name",
      sort_by: "jobCount:desc",
      per_page: "250",
      page: "1",
    })}`;
    const res = await fetch(url, { headers: { "X-TYPESENSE-API-KEY": apiKey } });
    if (res.ok) {
      const data = await res.json();
      for (const hit of data.hits ?? []) {
        if (hit.document.slug) slugs.push({ slug: hit.document.slug });
      }
    }
  } catch {}
  return slugs;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const sponsor = await fetchSponsor(params.slug);
  if (!sponsor) return { title: "Sponsor Not Found — SponsorMap" };

  const loc = [sponsor.town, sponsor.county].filter(Boolean).join(", ");
  const desc = `${sponsor.name} is a UK licensed visa sponsor${loc ? ` based in ${loc}` : ""}${sponsor.sector ? ` in the ${sponsor.sector} sector` : ""}. ${sponsor.jobCount > 0 ? `${sponsor.jobCount} live sponsorship jobs available.` : "Search and apply for sponsored roles."}`;

  return {
    title: `${sponsor.name} — UK Visa Sponsor | SponsorMap`,
    description: desc,
    openGraph: {
      title: `${sponsor.name} — UK Visa Sponsor`,
      description: desc,
      url: `https://sponsormap.engtx.co.uk/sponsors/${sponsor.slug}`,
    },
    alternates: { canonical: `https://sponsormap.engtx.co.uk/sponsors/${sponsor.slug}` },
  };
}

export default async function SponsorPage({ params }: { params: { slug: string } }) {
  const sponsor = await fetchSponsor(params.slug);
  if (!sponsor) notFound();

  const loc = [sponsor.town, sponsor.county].filter(Boolean).join(", ");
  const reedUrl = `https://www.reed.co.uk/jobs?keywords=${encodeURIComponent(sponsor.name)}`;
  const linkedinUrl = `https://www.linkedin.com/company/${encodeURIComponent(sponsor.name.toLowerCase().replace(/\s+/g, "-"))}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: sponsor.name,
    url: sponsor.careersUrl || undefined,
    address: loc ? {
      "@type": "PostalAddress",
      addressLocality: sponsor.town || undefined,
      addressRegion: sponsor.county || undefined,
      addressCountry: "GB",
    } : undefined,
    description: `UK licensed visa sponsor in the ${sponsor.sector || "various"} sector.`,
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Link href="/" style={{ fontSize: "13px", color: "var(--accent)", textDecoration: "none", marginBottom: "24px", display: "inline-block" }}>
          ← Back to search
        </Link>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--t-primary)", marginBottom: "6px" }}>{sponsor.name}</h1>
              {loc && <p style={{ fontSize: "14px", color: "var(--t-secondary)" }}>{loc}</p>}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {sponsor.status && (
                <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "12px", background: sponsor.status === "Active" ? "rgba(21,163,72,0.1)" : "rgba(239,68,68,0.1)", color: sponsor.status === "Active" ? "var(--c-green)" : "#ef4444" }}>
                  {sponsor.status}
                </span>
              )}
              {sponsor.rating && (
                <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "12px", background: "var(--accent-dim)", color: "var(--accent)" }}>
                  Rating: {sponsor.rating}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {sponsor.sector && <InfoItem label="Sector" value={sponsor.sector} />}
            {sponsor.region && <InfoItem label="Region" value={sponsor.region} />}
            {sponsor.route && <InfoItem label="Route" value={sponsor.route} />}
            {sponsor.atsType && <InfoItem label="ATS" value={sponsor.atsType} />}
          </div>

          {sponsor.jobCount > 0 && (
            <div style={{ padding: "14px 16px", borderRadius: "var(--r-sm)", background: "rgba(21,163,72,0.06)", border: "1px solid rgba(21,163,72,0.2)", marginBottom: "20px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--c-green)" }}>
                {sponsor.jobCount} live {sponsor.jobCount === 1 ? "job" : "jobs"} — sign in to view
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {sponsor.careersUrl && (
              <a href={sponsor.careersUrl} target="_blank" rel="noopener noreferrer" style={linkBtnStyle("accent")}>
                {sponsor.atsType ? `${sponsor.atsType} Careers →` : "Careers Page →"}
              </a>
            )}
            <a href={reedUrl} target="_blank" rel="noopener noreferrer" style={linkBtnStyle("default")}>Reed Jobs →</a>
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" style={linkBtnStyle("default")}>LinkedIn →</a>
            <a href={`https://find-and-update.company-information.service.gov.uk/?q=${encodeURIComponent(sponsor.name)}`} target="_blank" rel="noopener noreferrer" style={linkBtnStyle("default")}>Companies House →</a>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "20px" }}>
          <p style={{ fontSize: "13px", color: "var(--t-muted)", lineHeight: "1.6" }}>
            {sponsor.name} appears on the{" "}
            <a href="https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
              UK Home Office Register of Licensed Sponsors
            </a>
            . This means they are licensed to sponsor skilled workers for UK visas. Data is refreshed regularly from the official register.
          </p>
        </div>
      </main>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: "var(--r-sm)", background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--t-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--t-primary)" }}>{value}</div>
    </div>
  );
}

function linkBtnStyle(variant: "accent" | "default"): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: "20px",
    border: variant === "accent" ? "none" : "1px solid var(--border)",
    background: variant === "accent" ? "var(--accent)" : "var(--bg-raised)",
    color: variant === "accent" ? "#fff" : "var(--t-secondary)",
    fontSize: "12px",
    fontWeight: "700",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  };
}
