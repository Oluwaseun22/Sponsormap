import { NextRequest, NextResponse } from "next/server";
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
});

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.ip ?? "unknown";
  const now = Date.now();
  const record = rateLimitMap.get(ip) ?? { count: 0, windowStart: now };
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    record.count = 0;
    record.windowStart = now;
  }
  record.count++;
  rateLimitMap.set(ip, record);
  if (record.count > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
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
      posthog.identify({ distinctId: cleaned, properties: { email: cleaned, source } });
      posthog.capture({ distinctId: cleaned, event: "waitlist_signup", properties: { source } });

      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
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
      }
    }

    return NextResponse.json({
      success: true,
      already_subscribed: !isNew,
      message: isNew ? "You're on the list!" : "You're already signed up.",
    });
  } catch (err) {
    console.error("Waitlist error:", (err as Error).message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
