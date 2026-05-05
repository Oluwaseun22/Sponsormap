"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (consent === "true") {
      initPostHog();
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    capture_pageview: true,
    persistence: "localStorage+cookie",
  });
}
