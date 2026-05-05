with open("src/App.jsx", "r") as f:
    src = f.read()

patches = 0

# Fix 1 — replace <a tag with <div that expands on click
old1 = """      <a
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

new1 = """      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? "var(--bg-card-hi)" : "var(--bg-card)",
          border: `1px solid ${open ? "var(--accent-mid)" : "var(--border)"}`,
          borderRadius: open ? "var(--r-lg) var(--r-lg) 0 0" : "var(--r-lg)",
          padding: "14px 16px",
          borderLeft: `3px solid ${meta.color}`,
          paddingLeft: "14px",
          transition: "background var(--ease), border-color var(--ease), box-shadow var(--ease)",
          cursor: "pointer",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "var(--bg-card-hi)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)"; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.boxShadow = "none"; } }}
      >"""

if old1 in src:
    src = src.replace(old1, new1, 1)
    print("PATCH 1 applied: anchor replaced with clickable div")
    patches += 1
else:
    print("PATCH 1 NOT FOUND - trying to find anchor tag...")
    if "<a\n        href={reedUrl}" in src:
        print("Found anchor - whitespace mismatch")
    else:
        print("No anchor found at all")

# Fix closing </a> to </div>
old2 = """      </a>

      {/* Expanded: job links only */}"""
new2 = """      </div>

      {/* Expanded: job links only */}"""

if old2 in src:
    src = src.replace(old2, new2, 1)
    print("PATCH 2 applied: closing tag fixed")
    patches += 1
else:
    print("PATCH 2 NOT FOUND")

with open("src/App.jsx", "w") as f:
    f.write(src)

print(f"\n{patches} patches applied.")
