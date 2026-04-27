// api/waitlist.js
// Vercel serverless function — handles waitlist signups
// Saves email to Neon PostgreSQL, sends confirmation via Resend
// Environment variables required:
//   NEON_DATABASE_URL   — Neon connection string (pooled)
//   RESEND_API_KEY      — Resend API key

import { neon } from "@neondatabase/serverless";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DATABASE_URL = process.env.NEON_DATABASE_URL;

// Email confirmation template
function buildConfirmationEmail(email) {
    return {
        from: "SponsorMap <hello@sponsormap.engtx.co.uk>",
        to: email,
        subject: "You're on the SponsorMap list",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.09);overflow:hidden;max-width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(160deg,#111d38 0%,#162f5e 45%,#0e1b30 100%);padding:40px 36px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:32px;height:32px;background:linear-gradient(135deg,#c4852a,#d4963a);border-radius:9px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:16px;">📍</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="font-size:20px;font-weight:600;color:#f2ead8;font-family:Georgia,serif;letter-spacing:-0.02em;">SponsorMap</span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#f2ead8;font-family:Georgia,serif;font-size:28px;font-weight:700;margin:24px 0 8px;letter-spacing:-0.02em;line-height:1.2;">You're on the list.</h1>
              <p style="color:rgba(242,234,216,0.7);font-size:15px;margin:0;line-height:1.6;">We'll email you the moment SponsorMap Pro goes live.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="color:#4e4540;font-size:15px;line-height:1.75;margin:0 0 24px;">
                While you wait, the sponsor search is already live. 120,000+ UK companies. Filter by sector, city, and visa route. Completely free.
              </p>

              <!-- What's coming -->
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#f5f4f0;border-radius:12px;margin-bottom:28px;">
                <tr><td style="padding:20px 20px 4px;">
                  <p style="font-size:11px;font-weight:700;color:#9a8e84;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 14px;font-family:monospace;">Coming in Pro</p>
                </td></tr>
                ${[
                ["🔔", "Job Alerts", "Custom alerts when sponsors in your sector hire"],
                ["✦", "AI Job Scoring", "Every new job scored 0–100 against your CV"],
                ["📄", "CV Generation", "Tailored CV and cover letter per application"],
                ["💬", "Telegram Alerts", "Instant notifications the moment a match appears"],
            ].map(([icon, title, desc]) => `
                <tr><td style="padding:0 20px 16px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:18px;width:28px;vertical-align:top;padding-top:2px;">${icon}</td>
                    <td style="padding-left:10px;">
                      <div style="font-size:13px;font-weight:700;color:#16120e;margin-bottom:2px;">${title}</div>
                      <div style="font-size:12px;color:#9a8e84;line-height:1.5;">${desc}</div>
                    </td>
                  </tr></table>
                </td></tr>`).join("")}
                <tr><td style="padding:0 20px 20px;">
                  <p style="font-size:11px;color:#9a8e84;margin:8px 0 0;font-family:monospace;">First 200 sign-ups get Pro free for 3 months at launch.</p>
                </td></tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#c4852a;border-radius:20px;padding:0;">
                    <a href="https://sponsormap.engtx.co.uk" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:20px;">
                      Search sponsors now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid rgba(0,0,0,0.07);">
              <p style="font-size:11px;color:#9a8e84;margin:0;line-height:1.7;">
                You're receiving this because you signed up at sponsormap.engtx.co.uk.<br>
                Built by <a href="https://engtx.co.uk" style="color:#c4852a;">Segun Toriola (ENGTX)</a> · 
                <a href="https://sponsormap.engtx.co.uk/privacy" style="color:#c4852a;">Privacy policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    };
}

export default async function handler(req, res) {
    // Only accept POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "https://sponsormap.engtx.co.uk");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const { email, source = "waitlist" } = req.body || {};

    // Basic validation
    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
    }
    const cleaned = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    // Check env vars
    if (!DATABASE_URL || !RESEND_API_KEY) {
        console.error("Missing env vars: NEON_DATABASE_URL or RESEND_API_KEY");
        return res.status(500).json({ error: "Server configuration error" });
    }

    try {
        // --- 1. Save to Neon ---
        const sql = neon(DATABASE_URL);

        // Create table if it doesn't exist (idempotent)
        await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id          SERIAL PRIMARY KEY,
        email       TEXT NOT NULL UNIQUE,
        source      TEXT NOT NULL DEFAULT 'waitlist',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

        // Insert email — ignore duplicates
        const result = await sql`
      INSERT INTO waitlist (email, source)
      VALUES (${cleaned}, ${source})
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;

        const isNew = result.length > 0;

        // --- 2. Send confirmation via Resend (only for new signups) ---
        if (isNew) {
            const emailPayload = buildConfirmationEmail(cleaned);
            const resendRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(emailPayload),
            });

            if (!resendRes.ok) {
                // Log but don't fail the signup — email is saved even if Resend fails
                const err = await resendRes.text();
                console.error("Resend error:", err);
            }
        }

        return res.status(200).json({
            success: true,
            already_subscribed: !isNew,
            message: isNew ? "You're on the list!" : "You're already signed up.",
        });
    } catch (err) {
        console.error("Waitlist error:", err);
        return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
}