const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX    = 10;
const MAX_QUERY_LENGTH  = 500;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, windowStart: now };
  if (now - record.windowStart > RATE_LIMIT_WINDOW) { record.count = 0; record.windowStart = now; }
  record.count++;
  rateLimitMap.set(ip, record);
  if (record.count > RATE_LIMIT_MAX) return res.status(429).json({ error: "Too many requests. Please wait a minute." });

  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: "No query provided" });
  if (query.length > MAX_QUERY_LENGTH) return res.status(400).json({ error: "Query too long. Keep it under 500 characters." });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: "You are a UK Skilled Worker visa expert inside SponsorMap. Be direct and specific. 2026 thresholds: £41,700 general, £33,400 new entrant (under 26 or switching from Student visa). For company queries explain verification via find-employer-sponsors.homeoffice.gov.uk. For location/sector queries name 3-5 known A-rated sponsors. Max 150 words. No filler.",
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text;
    if (!text) { console.error("Anthropic response:", JSON.stringify(data)); return res.status(500).json({ error: "Empty response from AI" }); }
    res.status(200).json({ text });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
}
