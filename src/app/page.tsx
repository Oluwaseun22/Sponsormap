import { Suspense } from "react";
import SponsorMap from "@/components/SponsorApp";
import { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "https://sponsormap.engtx.co.uk" },
};

export default function HomePage() {
  return (
    <Suspense>
      <SponsorMap />
    </Suspense>
  );
}
