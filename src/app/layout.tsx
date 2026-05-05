import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { PostHogProvider } from "@/components/PostHogProvider";

export const metadata: Metadata = {
  title: "SponsorMap — Find UK Visa Sponsor Jobs",
  description:
    "Search 125,000+ UK companies licensed to sponsor Skilled Worker visas. Find jobs sourced directly from employer careers pages.",
  metadataBase: new URL("https://sponsormap.engtx.co.uk"),
  openGraph: {
    title: "SponsorMap — Find UK Visa Sponsor Jobs",
    description:
      "Search 125,000+ UK companies licensed to sponsor Skilled Worker visas. Find jobs sourced directly from employer careers pages.",
    url: "https://sponsormap.engtx.co.uk",
    siteName: "SponsorMap",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SponsorMap" }],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SponsorMap — Find UK Visa Sponsor Jobs",
    description: "Search 125,000+ UK companies licensed to sponsor Skilled Worker visas.",
    images: ["/og-image.png"],
  },
  alternates: { canonical: "https://sponsormap.engtx.co.uk" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "#C4872A",
          colorBackground: "#FAF8F5",
          colorText: "#16120e",
        },
      }}
    >
      <html lang="en" data-theme="light" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
            rel="stylesheet"
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "SponsorMap",
                url: "https://sponsormap.engtx.co.uk",
                description: "Search 125,000+ UK companies licensed to sponsor Skilled Worker visas.",
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://sponsormap.engtx.co.uk/?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              }),
            }}
          />
        </head>
        <body>
          <PostHogProvider>
            {children}
            <CookieConsent />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
