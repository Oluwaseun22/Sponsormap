<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog server-side analytics into SponsorMap. The `posthog-node` SDK was added to all three Vercel serverless API handlers. Each handler initialises a short-lived PostHog client (flushAt: 1, flushInterval: 0 — appropriate for serverless functions) and captures meaningful business events with contextual properties. User identification was added to the waitlist signup handler using the submitted email as the distinct ID, so waitlist subscribers can be tracked across sessions. Exception capture was wired into every catch block for automatic error tracking. The ESLint config was also updated to apply Node.js globals to the `api/` directory, fixing pre-existing lint errors.

| Event | Description | File |
|---|---|---|
| `waitlist_signup` | User successfully joins the V2 waitlist (new unique email only) | `api/waitlist.js` |
| `ai_query_submitted` | User submits a question to the AI visa assistant | `api/ask.js` |
| `sponsor_search` | User performs a sponsor search with filters | `api/search.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://eu.posthog.com/project/169845/dashboard/656511
- **Waitlist signups over time:** https://eu.posthog.com/project/169845/insights/PDEPo6tP
- **AI queries over time:** https://eu.posthog.com/project/169845/insights/BLWsQ3UH
- **Sponsor searches over time:** https://eu.posthog.com/project/169845/insights/v6d3JaEn
- **Search → waitlist signup funnel:** https://eu.posthog.com/project/169845/insights/bwExLH9F
- **Searches broken down by rating filter:** https://eu.posthog.com/project/169845/insights/xn0R6ReN

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
