# SponsorMap

**Find UK employers who can actually hire you.**

The Home Office publishes a register of every company licensed to sponsor Skilled Worker visas. 125,000+ rows. No search, no sector filter, no salary check — just a raw CSV. SponsorMap makes it searchable.

Live at [engtx.co.uk/sponsormap](https://engtx.co.uk/sponsormap)

## Stack
- Frontend: React + Vite
- Hosting: Vercel
- Database (V1): Supabase Postgres
- CSV refresh (V1): GitHub Actions daily cron
- Email: Resend
- AI: Anthropic Claude API

## Running locally
```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## .env.local (V1)

eof
