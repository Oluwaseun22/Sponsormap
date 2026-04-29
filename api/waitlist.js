import pg from "pg";

const { Client } = pg;

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

  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    const result = await client.query(
      "INSERT INTO waitlist (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
      [cleaned, source]
    );

    const isNew = result.rowCount > 0;

    if (isNew && RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SponsorMap <hello@sponsormap.engtx.co.uk>",
          to: cleaned,
          subject: "You're on the SponsorMap list",
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'DM Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid rgba(0,0,0,0.09);overflow:hidden;max-width:100%;">
  <tr>
    <td style="background:linear-gradient(160deg,#111d38 0%,#162f5e 45%,#0e1b30 100%);padding:40px 36px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:32px;height:32px;background:linear-gradient(135deg,#c4852a,#d4963a);border-radius:9px;text-align:center;line-height:32px;">
            <span style="color:#fff;font-size:16px;">📍</span>
          </td>
          <td style="padding-left:10px;vertical-align:middle;">
            <span style="font-size:20px;font-weight:600;color:#f2ead8;font-family:Georgia,serif;letter-spacing:-0.02em;">SponsorMap</span>
          </td>
        </tr>
      </table>
      <h1 style="color:#f2ead8;font-family:Georgia,serif;font-size:28px;font-weight:700;margin:24px 0 8px;letter-spacing:-0.02em;line-height:1.2;">You're on the list.</h1>
      <p style="color:rgba(242,234,216,0.7);font-size:15px;margin:0;line-height:1.6;">We'll email you the moment SponsorMap Pro goes live.</p>
    </td>
  </tr>
  <tr>
    <td style="padding:36px;">
      <p style="color:#4e4540;font-size:15px;line-height:1.75;margin:0 0 24px;">While you wait, the sponsor search is already live. 120,000+ UK companies licensed by the Home Office. Filter by sector, city, and visa route. Completely free.</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="background:#f5f4f0;border-radius:12px;padding:20px;margin-bottom:28px;">
        <tr><td>
          <p style="font-size:11px;font-weight:700;color:#9a8e84;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 16px;font-family:monospace;">Coming in Pro</p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding-bottom:14px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:18px;width:28px;vertical-align:top;padding-top:2px;">🔔</td>
                <td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#16120e;margin-bottom:2px;">Job Alerts</div><div style="font-size:12px;color:#9a8e84;">Custom alerts when sponsors in your sector hire</div></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding-bottom:14px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:18px;width:28px;vertical-align:top;padding-top:2px;">✦</td>
                <td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#16120e;margin-bottom:2px;">AI Job Scoring</div><div style="font-size:12px;color:#9a8e84;">Every job scored 0–100 against your CV</div></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding-bottom:14px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:18px;width:28px;vertical-align:top;padding-top:2px;">📄</td>
                <td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#16120e;margin-bottom:2px;">CV Generation</div><div style="font-size:12px;color:#9a8e84;">Tailored CV and cover letter per application</div></td>
              </tr></table>
            </td></tr>
            <tr><td>
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:18px;width:28px;vertical-align:top;padding-top:2px;">💬</td>
                <td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#16120e;margin-bottom:2px;">Telegram Alerts</div><div style="font-size:12px;color:#9a8e84;">Instant notifications the moment a match appears</div></td>
              </tr></table>
            </td></tr>
          </table>
          <p style="font-size:11px;color:#9a8e84;margin:16px 0 0;font-family:monospace;">First 200 sign-ups get Pro free for 3 months at launch.</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#c4852a;border-radius:20px;">
            <a href="https://sponsormap.engtx.co.uk" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;">Search sponsors now →</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 36px 28px;border-top:1px solid rgba(0,0,0,0.07);">
      <p style="font-size:11px;color:#9a8e84;margin:0;line-height:1.7;">
        You're receiving this because you signed up at sponsormap.engtx.co.uk.<br>
        Built by <a href="https://engtx.co.uk" style="color:#c4852a;text-decoration:none;">Segun Toriola (ENGTX)</a> ·
        <a href="https://sponsormap.engtx.co.uk/privacy" style="color:#c4852a;text-decoration:none;">Privacy policy</a> ·
        <a href="mailto:hello@sponsormap.engtx.co.uk" style="color:#c4852a;text-decoration:none;">Unsubscribe</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`,
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
  } finally {
    await client.end();
  }
}
