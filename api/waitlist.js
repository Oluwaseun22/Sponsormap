export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, source = "waitlist" } = req.body || {};

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  const cleaned = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const DATABASE_URL = process.env.NEON_DATABASE_URL;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!DATABASE_URL) {
    return res.status(500).json({ error: "Database not configured" });
  }

  try {
    const url = new URL(DATABASE_URL);
    const host = url.hostname;
    const user = decodeURIComponent(url.username);
    const pass = decodeURIComponent(url.password);
    const db   = url.pathname.slice(1).split("?")[0];
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");

    const neonUrl = `https://${host}/sql`;

    const insertRes = await fetch(neonUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Neon-Database-Name": db,
      },
      body: JSON.stringify({
        query: "INSERT INTO waitlist (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
        params: [cleaned, source],
      }),
    });

    const responseText = await insertRes.text();
    console.log("Neon status:", insertRes.status);
    console.log("Neon response:", responseText);

    if (!insertRes.ok) {
      return res.status(500).json({ error: "Database error", detail: responseText });
    }

    const insertData = JSON.parse(responseText);
    const isNew = Array.isArray(insertData.rows) && insertData.rows.length > 0;

    if (isNew && RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SponsorMap <onboarding@resend.dev>",
          to: cleaned,
          subject: "You're on the SponsorMap list",
          html: "<p>You're on the list. We'll email you when SponsorMap Pro goes live.</p><p><a href='https://sponsormap.engtx.co.uk'>Search 120,000+ sponsors now</a></p>",
        }),
      });
    }

    return res.status(200).json({
      success: true,
      already_subscribed: !isNew,
      message: isNew ? "You're on the list!" : "You're already signed up.",
      debug: insertData,
    });

  } catch (err) {
    console.error("Waitlist error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
