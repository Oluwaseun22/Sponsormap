"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<{ sponsors?: number; jobs?: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;

  useEffect(() => {
    if (!isLoaded) return;
    if (!user || !isAdmin) {
      router.replace("/");
      return;
    }
    // Fetch basic stats
    Promise.all([
      fetch("/api/search?q=*&perPage=1").then(r => r.json()).catch(() => null),
      fetch("/api/jobs?perPage=1").then(r => r.json()).catch(() => null),
    ]).then(([searchData, jobsData]) => {
      setStats({
        sponsors: searchData?.total ?? 0,
        jobs: jobsData?.total ?? 0,
      });
      setStatsLoading(false);
    });
  }, [isLoaded, user, isAdmin, router]);

  if (!isLoaded || !user || !isAdmin) return null;

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--t-primary)", marginBottom: "6px" }}>Admin Dashboard</h1>
        <p style={{ fontSize: "13px", color: "var(--t-muted)", marginBottom: "32px" }}>SponsorMap internal tools</p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          <StatCard label="Total Sponsors" value={statsLoading ? "…" : (stats?.sponsors?.toLocaleString() ?? "—")} />
          <StatCard label="Live Jobs" value={statsLoading ? "…" : (stats?.jobs?.toLocaleString() ?? "—")} />
        </div>

        {/* Actions */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "24px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "16px" }}>Data Management</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <ActionButton
              label="Refresh Search Index"
              description="Re-index sponsors from source"
              href="/api/admin/reindex"
            />
            <ActionButton
              label="Trigger Job Scrape"
              description="Dispatch scrape for all sponsors"
              href="/api/admin/scrape"
            />
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "12px" }}>Quick Links</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <QuickLink href="https://cloud.typesense.org" label="Typesense Cloud" />
            <QuickLink href="https://console.upstash.com" label="Upstash Redis" />
            <QuickLink href="https://eu.posthog.com" label="PostHog Analytics" />
            <QuickLink href="https://vercel.com/dashboard" label="Vercel Dashboard" />
            <QuickLink href="https://dashboard.clerk.com" label="Clerk Dashboard" />
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "20px" }}>
      <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--accent)", marginBottom: "4px" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "var(--t-muted)", fontWeight: "600" }}>{label}</div>
    </div>
  );
}

function ActionButton({ label, description, href }: { label: string; description: string; href: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const trigger = async () => {
    setStatus("loading");
    try {
      const res = await fetch(href, { method: "POST" });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <div style={{ padding: "16px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-raised)", minWidth: "180px" }}>
      <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "11px", color: "var(--t-muted)", marginBottom: "12px" }}>{description}</div>
      <button
        onClick={trigger}
        disabled={status === "loading"}
        style={{ padding: "7px 14px", borderRadius: "var(--r-sm)", border: "none", background: status === "done" ? "var(--c-green)" : status === "error" ? "#ef4444" : "var(--accent)", color: "#fff", fontSize: "12px", fontWeight: "700", cursor: status === "loading" ? "wait" : "pointer", fontFamily: "var(--ff-ui)" }}
      >
        {status === "loading" ? "Running…" : status === "done" ? "Done ✓" : status === "error" ? "Error ✗" : "Trigger"}
      </button>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-raised)", color: "var(--t-secondary)", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
      {label} ↗
    </a>
  );
}
