import { NextRequest, NextResponse } from "next/server";
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
});

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const MAX_QUERY_LENGTH = 500;

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
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute." },
      { status: 429 }
    );
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { query } = body;
  if (!query) return NextResponse.json({ error: "No query provided" }, { status: 400 });
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query too long. Keep it under 500 characters." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:
          "You are a UK Skilled Worker visa expert inside SponsorMap. Be direct and specific. 2026 thresholds: £41,700 general, £33,400 new entrant (under 26 or switching from Student visa). For company queries explain verification via find-employer-sponsors.homeoffice.gov.uk. For location/sector queries name 3-5 known A-rated sponsors. Max 150 words. No filler.",
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await response.json();
    const text = data.content?.find(
      (b: { type: string; text?: string }) => b.type === "text"
    )?.text;
    if (!text) {
      console.error("Anthropic response:", JSON.stringify(data));
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }
    posthog.capture({
      distinctId: ip,
      event: "ai_query_submitted",
      properties: { query_length: query.length },
    });
    return NextResponse.json({ text });
  } catch (err) {
    console.error("AI error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
