import re

with open("src/App.jsx", "r") as f:
    src = f.read()

patches_applied = 0

# PATCH 1: wire handleWaitSubmit
old1 = '  const handleWaitSubmit = () => {\n    if (!waitEmail.trim()) { setWaitError("Enter your email address."); return; }\n    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(waitEmail)) { setWaitError("That doesn\'t look like a valid email."); return; }\n    setWaitError(""); setWaitSubmitted(true);\n  };'
new1 = '  const handleWaitSubmit = async () => {\n    if (!waitEmail.trim()) { setWaitError("Enter your email address."); return; }\n    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(waitEmail)) { setWaitError("That doesn\'t look like a valid email."); return; }\n    setWaitError("");\n    try {\n      const res = await fetch("/api/waitlist", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ email: waitEmail.trim(), source: "hero_cta" }),\n      });\n      const data = await res.json();\n      if (data.success) { setWaitSubmitted(true); }\n      else { setWaitError(data.error || "Something went wrong. Try again."); }\n    } catch { setWaitError("Couldn\'t connect. Please try again."); }\n  };'

if old1 in src:
    src = src.replace(old1, new1)
    print("PATCH 1 applied: handleWaitSubmit wired to API")
    patches_applied += 1
else:
    print("PATCH 1 NOT FOUND - handleWaitSubmit unchanged")

# PATCH 2a: add footerLoading state
old2a = '  const [footerDone,    setFooterDone]    = useState(false);'
new2a = '  const [footerDone,    setFooterDone]    = useState(false);\n  const [footerLoading, setFooterLoading] = useState(false);'

if old2a in src:
    src = src.replace(old2a, new2a, 1)
    print("PATCH 2a applied: footerLoading state added")
    patches_applied += 1
else:
    print("PATCH 2a NOT FOUND - footerLoading state not added")

# PATCH 2b: add handleFooterSubscribe before handleFeatureClick
old2b = '  const handleFeatureClick = (f) => {'
new2b = '  const handleFooterSubscribe = async () => {\n    if (!footerEmail.includes("@")) return;\n    setFooterLoading(true);\n    try {\n      const res = await fetch("/api/waitlist", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ email: footerEmail.trim(), source: "footer_digest" }),\n      });\n      const data = await res.json();\n      if (data.success) setFooterDone(true);\n    } catch {}\n    setFooterLoading(false);\n  };\n\n  const handleFeatureClick = (f) => {'

if old2b in src:
    src = src.replace(old2b, new2b, 1)
    print("PATCH 2b applied: handleFooterSubscribe added")
    patches_applied += 1
else:
    print("PATCH 2b NOT FOUND - handleFooterSubscribe not added")

# PATCH 2c: wire footer button
old2c = 'onClick={() => { if (footerEmail.includes("@")) setFooterDone(true); }}'
new2c = 'onClick={handleFooterSubscribe} disabled={footerLoading}'

if old2c in src:
    src = src.replace(old2c, new2c, 1)
    print("PATCH 2c applied: footer button wired")
    patches_applied += 1
else:
    print("PATCH 2c NOT FOUND - footer button unchanged")

# PATCH 3: Ecosystem heading
old3 = 'The ENGTX Job Intelligence Suite'
new3 = "What's next"

if old3 in src:
    src = src.replace(old3, new3, 1)
    print("PATCH 3a applied: Ecosystem label updated")
    patches_applied += 1
else:
    print("PATCH 3a NOT FOUND")

old3b = 'SponsorMap is just the entry point'
new3b = 'The full job hunt \u2014 coming to Pro.'

if old3b in src:
    src = src.replace(old3b, new3b, 1)
    print("PATCH 3b applied: Ecosystem heading updated")
    patches_applied += 1
else:
    print("PATCH 3b NOT FOUND")

# PATCH 4: Civil Service Tracker -> Filter
old4 = 'Civil Service Tracker'
new4 = 'Civil Service Filter'

if old4 in src:
    src = src.replace(old4, new4)
    print("PATCH 4 applied: Civil Service label fixed")
    patches_applied += 1
else:
    print("PATCH 4 NOT FOUND")

with open("src/App.jsx", "w") as f:
    f.write(src)

print(f"\n{patches_applied} patches applied. App.jsx saved.")
