import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — SponsorMap",
  description: "Privacy Policy for SponsorMap.",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px" }}>
      <Link href="/" style={{ fontSize: "13px", color: "var(--accent)", textDecoration: "none", marginBottom: "32px", display: "inline-block" }}>
        ← Back to SponsorMap
      </Link>
      <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--t-primary)", marginBottom: "8px" }}>Privacy Policy</h1>
      <p style={{ fontSize: "13px", color: "var(--t-muted)", marginBottom: "40px" }}>Last updated: 1 May 2025</p>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "10px" }}>1. What We Collect</h2>
        <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7" }}>
          When you create an account, we collect your email address and authentication credentials via Clerk. If you join the waitlist, we store your email in Upstash Redis. We do not sell your personal data.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "10px" }}>2. Analytics</h2>
        <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7" }}>
          We use PostHog for product analytics. Analytics are only initialised after you give cookie consent. You can decline analytics and the core search functionality will still work.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "10px" }}>3. Cookies</h2>
        <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7" }}>
          We use localStorage to remember your cookie consent preference and session bookmarks. Authentication cookies are set by Clerk. Analytics cookies are only set if you consent.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "10px" }}>4. Third-Party Services</h2>
        <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7" }}>
          We use Clerk (authentication), PostHog (analytics), Typesense (search), and Upstash (storage). Each has their own privacy policy.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "10px" }}>5. Your Rights</h2>
        <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7" }}>
          You have the right to access, correct, or delete your personal data. Email us at <a href="mailto:hello@sponsormap.engtx.co.uk" style={{ color: "var(--accent)" }}>hello@sponsormap.engtx.co.uk</a> to make a request.
        </p>
      </section>

      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "10px" }}>6. Contact</h2>
        <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7" }}>
          For privacy enquiries: <a href="mailto:hello@sponsormap.engtx.co.uk" style={{ color: "var(--accent)" }}>hello@sponsormap.engtx.co.uk</a>
        </p>
      </section>
    </main>
  );
}
