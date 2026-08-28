# Lineup

Daily sports-odds email for the teams you actually bet. Pick favorites on the web; get moneylines, spreads, and one recommended bet in your inbox.

The 2021 Codere scraper in `legacy/` is retired.

## Stack

- Next.js on Vercel
- Neon Postgres (Drizzle)
- [The Odds API](https://the-odds-api.com/)
- Resend for magic links and the digest

## Setup

1. Copy `.env.example` to `.env.local` and fill in the keys.
2. Create a Neon database and run `npm run db:push` (or apply `drizzle/0000_init.sql`).
3. Create an Odds API key (free tier is enough to start).
4. Create a Resend API key. Verify a domain, or use `beth.t@example.com` in development.
5. Set `SESSION_SECRET` to a long random string and `CRON_SECRET` to another.
6. Run `npm install` then `npm run dev`.

Without `RESEND_API_KEY` in development, the magic-link URL is printed in the server log.

## Digest rule

Email goes out daily (Vercel Cron at 14:00 UTC) only when a favorite team has a game in the next 48 hours. The recommended bet is the favorited team with the shortest consensus moneyline (highest implied probability). Consensus is the average of returned bookmakers. That team’s consensus spread is included when the API returns one.

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Add the same env vars (`ODDS_API_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `SESSION_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`).
3. Set `NEXT_PUBLIC_APP_URL` to the production origin (no trailing slash), e.g. `https://lineup-sastiazaran.vercel.app`.
4. Cron is declared in `vercel.json`. Hobby plans allow one cron; this app uses that slot.
5. After the first deploy, sign in, save a lineup, then trigger `/api/cron/digest` with `Authorization: Bearer $CRON_SECRET` to smoke-test mail.

## Security

The original `CasinoTracker.py` committed a Gmail app password. **Revoke that password** in Google Account → Security → App passwords. Do not put SMTP secrets in source; this app reads them from environment variables only.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local Next.js |
| `npm test` | Recommendation unit tests |
| `npm run build` | Production build |
| `npm run db:push` | Push Drizzle schema to Neon |
