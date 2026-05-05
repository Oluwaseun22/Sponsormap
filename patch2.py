with open("src/App.jsx", "r") as f:
    src = f.read()

patches = 0

# PATCH 1 — Remove "First 200 sign-ups get Pro free for 3 months" from waitlist CTA
old1 = "Job alerts, CV generation, Telegram notifications — all in build. First 200 sign-ups get Pro free for 3 months."
new1 = "Job alerts, CV generation, Telegram notifications — all in build. Sign up to get notified when they ship."
if old1 in src:
    src = src.replace(old1, new1)
    print("PATCH 1 applied: removed free offer from CTA body")
    patches += 1
else:
    print("PATCH 1 not found — checking alternate...")
    old1b = "First 200 sign-ups get Pro free for 3 months."
    if old1b in src:
        src = src.replace(old1b, "Sign up to get notified when they ship.")
        print("PATCH 1 applied via alternate")
        patches += 1
    else:
        print("PATCH 1 NOT FOUND")

# PATCH 2 — Remove ECOSYSTEM constant
old2 = """const ECOSYSTEM = [
  { name: "SponsorMap",         desc: "Who can hire you",       status: "live",   icon: "⌕" },
  { name: "JobHunter Pro",      desc: "Search Reed & Indeed",   status: "suite",  icon: "◈" },
  { name: "NHS Job Tracker",    desc: "Health & care sector",   status: "suite",  icon: "✚" },
  { name: "Civil Service",      desc: "Public sector roles",    status: "coming", icon: "🏛" },
  { name: "Tech Job Radar",     desc: "Software engineers",     status: "coming", icon: "⬡" },
];"""
if old2 in src:
    src = src.replace(old2, "")
    print("PATCH 2 applied: ECOSYSTEM constant removed")
    patches += 1
else:
    print("PATCH 2 NOT FOUND — ECOSYSTEM constant may already be removed")

# PATCH 3 — Replace ECOSYSTEM section rendering with coming-to-Pro cards
old3 = """          <div className="reveal" style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            {ECOSYSTEM.map((tool) => (
              <div key={tool.name} style={{ flex: "1 1 150px", maxWidth: "180px", background: tool.status === "live" ? "var(--accent-dim)" : "var(--bg-card)", border: `1px solid ${tool.status === "live" ? "var(--accent-mid)" : "var(--border)"}`, borderRadius: "var(--r-lg)", padding: "18px 16px", textAlign: "center", position: "relative" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{tool.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "3px", fontFamily: "var(--ff-display)" }}>{tool.name}</div>
                <div style={{ fontSize: "11px", color: "var(--t-muted)", lineHeight: "1.4", marginBottom: "10px" }}>{tool.desc}</div>
                <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", fontFamily: "var(--ff-mono)", background: tool.status === "live" ? "var(--c-green-dim)" : tool.status === "suite" ? "rgba(37,99,235,0.1)" : "var(--accent-dim)", color: tool.status === "live" ? "var(--c-green)" : tool.status === "suite" ? "var(--c-blue)" : "var(--accent)", border: `1px solid ${tool.status === "live" ? "var(--c-green-border)" : tool.status === "suite" ? "rgba(37,99,235,0.2)" : "var(--accent-mid)"}` }}>
                  {tool.status === "live" ? "Live" : tool.status === "suite" ? "In suite" : "Coming"}
                </span>
              </div>
            ))}
          </div>"""

new3 = """          <div className="reveal" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              { icon: "🔔", label: "Job Alerts", desc: "Your sector hires — you know first" },
              { icon: "✦", label: "AI Job Scoring", desc: "Every job scored against your profile" },
              { icon: "📄", label: "CV Generation", desc: "Tailored CV and letter per application" },
              { icon: "⬡", label: "Browser Extension", desc: "Sponsor status on LinkedIn & Indeed" },
              { icon: "💬", label: "Telegram Alerts", desc: "Instant match notifications" },
            ].map(f => (
              <div key={f.label} style={{ flex: "1 1 160px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "18px 16px" }}>
                <div style={{ fontSize: "22px", marginBottom: "8px" }}>{f.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "3px", fontFamily: "var(--ff-display)" }}>{f.label}</div>
                <div style={{ fontSize: "11px", color: "var(--t-muted)", lineHeight: "1.4", marginBottom: "10px" }}>{f.desc}</div>
                <div style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "20px", display: "inline-block", background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-mid)", textTransform: "uppercase", fontFamily: "var(--ff-mono)" }}>Pro</div>
              </div>
            ))}
          </div>"""

if old3 in src:
    src = src.replace(old3, new3)
    print("PATCH 3 applied: ECOSYSTEM cards replaced with Pro features")
    patches += 1
else:
    print("PATCH 3 NOT FOUND — checking if already updated...")
    if "Job Alerts" in src and "AI Job Scoring" in src:
        print("PATCH 3 already applied")
    else:
        print("PATCH 3 needs manual fix")

# PATCH 4 — Make sponsor card clickable (wrap top div in anchor tag)
old4 = """      <div
        style={{
          background: open ? "var(--bg-card-hi)" : "var(--bg-card)",
          border: `1px solid ${open ? "var(--accent-mid)" : "var(--border)"}`,
          borderRadius: open ? "var(--r-lg) var(--r-lg) 0 0" : "var(--r-lg)",
          padding: "14px 16px",
          borderLeft: `3px solid ${meta.color}`,
          paddingLeft: "14px",
          transition: "background var(--ease), border-color var(--ease), box-shadow var(--ease)",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "var(--bg-card-hi)"; e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.15), inset 0 0 0 0 transparent`; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.boxShadow = "none"; } }}
      >"""

new4 = """      <a
        href={reedUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textDecoration: "none",
          background: open ? "var(--bg-card-hi)" : "var(--bg-card)",
          border: `1px solid ${open ? "var(--accent-mid)" : "var(--border)"}`,
          borderRadius: open ? "var(--r-lg) var(--r-lg) 0 0" : "var(--r-lg)",
          padding: "14px 16px",
          borderLeft: `3px solid ${meta.color}`,
          paddingLeft: "14px",
          transition: "background var(--ease), border-color var(--ease), box-shadow var(--ease)",
          cursor: "pointer",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-card-hi)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.boxShadow = "none"; }}
      >"""

if old4 in src:
    src = src.replace(old4, new4, 1)
    print("PATCH 4a applied: card top div changed to anchor tag")
    patches += 1
    # Now fix the closing tag - find the specific closing div after the tag row
    old4b = """      </div>

      {/* Expanded: job links only */}"""
    new4b = """      </a>

      {/* Expanded: job links only */}"""
    if old4b in src:
        src = src.replace(old4b, new4b, 1)
        print("PATCH 4b applied: closing tag changed to </a>")
        patches += 1
    else:
        print("PATCH 4b NOT FOUND")
else:
    print("PATCH 4 NOT FOUND")

with open("src/App.jsx", "w") as f:
    f.write(src)

print(f"\n{patches} patches applied. App.jsx saved.")
