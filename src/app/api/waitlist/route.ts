// AUDIT FIX [6.8/7.2]: rate limit now backed by Upstash Redis (was in-memory Map — useless on serverless).
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp, rateLimitHeaders } from "@/lib/rate-limit";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 60 * 60; // one hour

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit({
    id: ip,
    scope: "waitlist",
    max: RATE_LIMIT_MAX,
    windowSeconds: RATE_LIMIT_WINDOW_SEC,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, source = "waitlist" } = body;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const cleaned = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Store in Upstash Redis (replaces Postgres for simplicity)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // SADD to a set — returns 1 if new, 0 if already exists
    const addRes = await fetch(`${redisUrl}/sadd/waitlist/${encodeURIComponent(cleaned)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const addData = await addRes.json();
    const isNew = addData.result === 1;

    if (isNew) {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Segun at SponsorMap <hello@sponsormap.engtx.co.uk>",
            to: cleaned,
            subject: "You're on the list",
            text: `Hey — you're on the list.\n\nI'll email you when SponsorMap Pro goes live with job alerts, AI scoring, and CV generation.\n\nWhile you wait, the sponsor search is already live: https://sponsormap.engtx.co.uk\n\n— Segun\nFounder, SponsorMap`,
          }),
        });
        if (!resendRes.ok) {
          console.error("Resend failed:", resendRes.status, await resendRes.text());
        }
      }
    }

    // AUDIT FIX [waitlist enumeration]: identical response for new vs existing subscribers
    // so no one can probe whether an email is on the waitlist by submitting it.
    return NextResponse.json({
      success: true,
      message: "You're on the list!",
    });
  } catch (err) {
    console.error("Waitlist error:", (err as Error).message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
