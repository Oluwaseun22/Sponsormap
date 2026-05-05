import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — SponsorMap",
  description: "Terms of Service for SponsorMap.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px" }}>
      <Link href="/" style={{ fontSize: "13px", color: "var(--accent)", textDecoration: "none", marginBottom: "32px", display: "inline-block" }}>
        ← Back to SponsorMap
      </Link>
      <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--t-primary)", marginBottom: "8px" }}>Terms of Service</h1>
      <p style={{ fontSize: "13px", color: "var(--t-muted)", marginBottom: "40px" }}>Last updated: 1 May 2025</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Acceptance of Terms</h2>
        <p style={pStyle}>By accessing or using SponsorMap (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Description of Service</h2>
        <p style={pStyle}>SponsorMap is a search tool that aggregates publicly available information about UK visa sponsorship licence holders published by the Home Office. The Service does not provide immigration advice and is not affiliated with the UK government.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>3. Data Sources</h2>
        <p style={pStyle}>Sponsor data is sourced from the official UK Home Office Register of Licensed Sponsors, which is published under the Open Government Licence v3.0. Job listings are sourced from publicly accessible applicant tracking systems.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>4. User Accounts</h2>
        <p style={pStyle}>Some features require a user account. You are responsible for maintaining the security of your account credentials. We reserve the right to suspend accounts that violate these Terms.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>5. Acceptable Use</h2>
        <p style={pStyle}>You may not use the Service to:</p>
        <ul style={ulStyle}>
          <li style={liStyle}>Scrape, crawl, or systematically download data in bulk</li>
          <li style={liStyle}>Attempt to circumvent rate limits or access controls</li>
          <li style={liStyle}>Use the Service for any unlawful purpose</li>
          <li style={liStyle}>Resell or redistribute the data without permission</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>6. No Immigration Advice</h2>
        <p style={pStyle}>SponsorMap does not provide immigration, legal, or financial advice. Always consult a qualified immigration adviser or solicitor for guidance on your specific situation.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>7. Accuracy of Information</h2>
        <p style={pStyle}>We endeavour to keep data accurate and up to date, but we make no warranties regarding completeness, accuracy, or fitness for a particular purpose. The sponsor register is updated periodically by the Home Office and our data may lag behind.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>8. Intellectual Property</h2>
        <p style={pStyle}>The SponsorMap name, logo, and original content are owned by the operator. The underlying sponsor data is public data published under the Open Government Licence.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>9. Limitation of Liability</h2>
        <p style={pStyle}>To the fullest extent permitted by law, SponsorMap and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>10. Changes to Terms</h2>
        <p style={pStyle}>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>11. Governing Law</h2>
        <p style={pStyle}>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>12. Contact</h2>
        <p style={pStyle}>For questions about these Terms, contact us at <a href="mailto:hello@sponsormap.engtx.co.uk" style={{ color: "var(--accent)" }}>hello@sponsormap.engtx.co.uk</a>.</p>
      </section>
    </main>
  );
}

const sectionStyle: React.CSSProperties = { marginBottom: "32px" };
const h2Style: React.CSSProperties = { fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "10px" };
const pStyle: React.CSSProperties = { fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7" };
const ulStyle: React.CSSProperties = { paddingLeft: "20px", margin: "8px 0" };
const liStyle: React.CSSProperties = { fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.7", marginBottom: "4px" };
