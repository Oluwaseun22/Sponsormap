import { neon } from "@neondatabase/serverless";

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
    const sql = neon(DATABASE_URL);

    const result = await sql`
      INSERT INTO waitlist (email, source)
      VALUES (${cleaned}, ${source})
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;

    const isNew = result.length > 0;

    if (isNew && RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SponsorMap <onboarding@resend.dev>",
          to: cleaned,
          subject: "You're on the SponsorMap list",
          html: "<p>You're on the list. We'll email you when SponsorMap Pro goes live.</p><p><a href='https://sponsormap.engtx.co.uk'>Search 120,000+ sponsors now →</a></p>",
        }),
      });
    }

    return res.status(200).json({
      success: true,
      already_subscribed: !isNew,
      message: isNew ? "You're on the list!" : "You're already signed up.",
    });

  } catch (err) {
    console.error("Waitlist error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
