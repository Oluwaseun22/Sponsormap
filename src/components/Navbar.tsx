"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { useState } from "react";

export function Navbar({ onSearch }: { onSearch?: (view: string) => void }) {
  const pathname = usePathname();
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const isHome = pathname === "/";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--header-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 20px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--t-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            SponsorMap
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "16px",
          }}
          className="hide-mobile"
        >
          {isHome && (
            <>
              <button
                onClick={() => onSearch?.("search")}
                style={navBtnStyle(pathname === "/")}
              >
                Search
              </button>
              <button
                onClick={() => onSearch?.("salary")}
                style={navBtnStyle(false)}
              >
                Salary
              </button>
            </>
          )}
          {!isHome && (
            <>
              <Link href="/" style={navLinkStyle(pathname === "/")}>Home</Link>
              <Link href="/#search" style={navLinkStyle(false)}>Search</Link>
            </>
          )}
          <SignedIn>
            <Link href="/jobs" style={navLinkStyle(pathname === "/jobs")}>
              Jobs
            </Link>
          </SignedIn>
        </nav>

        {/* Auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <SignedOut>
            <Link
              href="/sign-in"
              style={{
                padding: "7px 16px",
                borderRadius: "20px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--t-secondary)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              style={{
                padding: "7px 16px",
                borderRadius: "20px",
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Sign up
            </Link>
          </SignedOut>

          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: { width: "32px", height: "32px" },
                },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Find Jobs"
                  labelIcon={<span>💼</span>}
                  href="/jobs"
                />
                {isAdmin && (
                  <UserButton.Link
                    label="Admin Dashboard"
                    labelIcon={<span>⚙️</span>}
                    href="/admin"
                  />
                )}
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            style={{
              display: "none",
              width: "36px",
              height: "36px",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "18px",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="show-mobile"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            background: "var(--bg-raised)",
            borderTop: "1px solid var(--border)",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <Link href="/" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Home</Link>
          <Link href="/#search" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Search Sponsors</Link>
          <SignedIn>
            <Link href="/jobs" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Live Jobs</Link>
          </SignedIn>
          <SignedOut>
            <Link href="/sign-in" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Sign in</Link>
            <Link href="/sign-up" onClick={() => setMenuOpen(false)} style={{ ...mobileLinkStyle, color: "var(--accent)", fontWeight: 700 }}>Sign up free</Link>
          </SignedOut>
        </div>
      )}

      <div className="header-line" />
    </header>
  );
}

function navBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: "var(--r-sm)",
    border: active ? "1px solid var(--accent)" : "1px solid transparent",
    background: active ? "var(--accent-dim)" : "transparent",
    color: active ? "var(--accent)" : "var(--t-secondary)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  };
}

function navLinkStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: "var(--r-sm)",
    border: active ? "1px solid var(--accent)" : "1px solid transparent",
    background: active ? "var(--accent-dim)" : "transparent",
    color: active ? "var(--accent)" : "var(--t-secondary)",
    fontSize: "13px",
    fontWeight: 500,
    textDecoration: "none",
    transition: "all 0.2s",
  };
}

const mobileLinkStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "var(--r-sm)",
  color: "var(--t-primary)",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
  background: "var(--bg-card-hi)",
};
