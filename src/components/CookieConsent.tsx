"use client";

import { useState, useEffect } from "react";
import { initPostHog } from "./PostHogProvider";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (stored === null) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "true");
    setVisible(false);
    initPostHog();
  };

  const decline = () => {
    localStorage.setItem("cookie-consent", "false");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--bg-raised)",
        borderTop: "1px solid var(--border)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.1)",
        animation: "slideUp 0.3s ease forwards",
      }}
    >
      <p style={{ flex: 1, fontSize: "13px", color: "var(--t-secondary)", minWidth: "200px" }}>
        We use cookies to improve your experience and understand how SponsorMap is used.{" "}
        <a href="/privacy" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Privacy Policy
        </a>
      </p>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            padding: "8px 18px",
            borderRadius: "20px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--t-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: "8px 18px",
            borderRadius: "20px",
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
