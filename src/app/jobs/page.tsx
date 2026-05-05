"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  sector: string;
  region: string;
  atsType: string;
  careersUrl: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  postedAt?: number;
  sponsorSlug: string;
}

const SECTORS = ["All Sectors", "Technology", "Healthcare", "Finance", "Education", "Engineering", "Legal", "Retail", "Hospitality", "Construction", "Manufacturing", "Media", "Charity", "Government"];
const REGIONS = ["All Regions", "London", "South East", "North West", "Yorkshire", "West Midlands", "East Midlands", "South West", "East of England", "North East", "Scotland", "Wales", "Northern Ireland"];
const ATS_TYPES = ["All ATS", "greenhouse", "lever", "workday", "ashby"];

export default function JobsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [region, setRegion] = useState("");
  const [atsType, setAtsType] = useState("");
  const [salaryMin, setSalaryMin] = useState("");

  const perPage = 20;

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (q) params.set("q", q);
    if (sector) params.set("sector", sector);
    if (region) params.set("region", region);
    if (atsType) params.set("atsType", atsType);
    if (salaryMin) params.set("salaryMin", salaryMin);
    try {
      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setJobs(data.results ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page, q, sector, region, atsType, salaryMin]);

  useEffect(() => {
    if (isSignedIn) fetchJobs();
  }, [isSignedIn, fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const totalPages = Math.ceil(total / perPage);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--t-primary)", marginBottom: "6px" }}>Live Sponsorship Jobs</h1>
          <p style={{ fontSize: "13px", color: "var(--t-muted)" }}>
            {total > 0 ? `${total.toLocaleString()} jobs from licensed sponsors` : "Search jobs from UK visa sponsors"}
          </p>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Job title, keyword…"
            style={inputStyle}
          />
          <select value={sector} onChange={e => { setSector(e.target.value === "All Sectors" ? "" : e.target.value); setPage(1); }} style={selectStyle}>
            {SECTORS.map(s => <option key={s} value={s === "All Sectors" ? "" : s}>{s}</option>)}
          </select>
          <select value={region} onChange={e => { setRegion(e.target.value === "All Regions" ? "" : e.target.value); setPage(1); }} style={selectStyle}>
            {REGIONS.map(r => <option key={r} value={r === "All Regions" ? "" : r}>{r}</option>)}
          </select>
          <select value={atsType} onChange={e => { setAtsType(e.target.value === "All ATS" ? "" : e.target.value); setPage(1); }} style={selectStyle}>
            {ATS_TYPES.map(a => <option key={a} value={a === "All ATS" ? "" : a}>{a}</option>)}
          </select>
          <select value={salaryMin} onChange={e => { setSalaryMin(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">Any Salary</option>
            <option value="20000">£20k+</option>
            <option value="30000">£30k+</option>
            <option value="40000">£40k+</option>
            <option value="50000">£50k+</option>
            <option value="60000">£60k+</option>
            <option value="80000">£80k+</option>
            <option value="100000">£100k+</option>
          </select>
          <button type="submit" style={btnStyle}>Search</button>
        </form>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--t-muted)", fontSize: "14px" }}>Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--t-muted)", fontSize: "14px" }}>No jobs found. Try different filters.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "32px" }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={pageBtnStyle(false)}
            >
              ← Prev
            </button>
            <span style={{ fontSize: "13px", color: "var(--t-secondary)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={pageBtnStyle(false)}
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function JobCard({ job }: { job: Job }) {
  const salary = job.salaryMin
    ? job.salaryMax
      ? `£${(job.salaryMin / 1000).toFixed(0)}k–£${(job.salaryMax / 1000).toFixed(0)}k`
      : `£${(job.salaryMin / 1000).toFixed(0)}k+`
    : null;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "16px", transition: "border-color var(--ease), box-shadow var(--ease)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-mid)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(196,135,42,0.08)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a
            href={job.careersUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "15px", fontWeight: "700", color: "var(--t-primary)", textDecoration: "none", display: "block", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {job.title}
          </a>
          <Link href={`/sponsors/${job.sponsorSlug}`} style={{ fontSize: "13px", color: "var(--accent)", fontWeight: "600", textDecoration: "none" }}>
            {job.company}
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {job.location && <Tag>{job.location}</Tag>}
            {job.sector && <Tag>{job.sector}</Tag>}
            {salary && <Tag color="green">{salary}</Tag>}
            {job.atsType && <Tag color="blue">{job.atsType}</Tag>}
          </div>
        </div>
        <a
          href={job.careersUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ flexShrink: 0, padding: "8px 16px", borderRadius: "20px", background: "var(--accent)", color: "#fff", fontSize: "12px", fontWeight: "700", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Apply →
        </a>
      </div>
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color?: "green" | "blue" }) {
  const bg = color === "green" ? "rgba(21,163,72,0.08)" : color === "blue" ? "rgba(59,130,246,0.08)" : "var(--bg-raised)";
  const fg = color === "green" ? "var(--c-green)" : color === "blue" ? "#3b82f6" : "var(--t-muted)";
  return (
    <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "10px", background: bg, color: fg }}>
      {children}
    </span>
  );
}

const inputStyle: React.CSSProperties = { flex: "1 1 200px", padding: "9px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-raised)", color: "var(--t-primary)", fontSize: "13px", outline: "none", fontFamily: "var(--ff-ui)" };
const selectStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-raised)", color: "var(--t-primary)", fontSize: "13px", cursor: "pointer", fontFamily: "var(--ff-ui)" };
const btnStyle: React.CSSProperties = { padding: "9px 20px", borderRadius: "var(--r-sm)", border: "none", background: "var(--accent)", color: "#fff", fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "var(--ff-ui)" };
const pageBtnStyle = (_active: boolean): React.CSSProperties => ({ padding: "8px 16px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-raised)", color: "var(--t-secondary)", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "var(--ff-ui)" });
