# AI Builders Latam Website

Next.js app for the AI Builders Latam public site, newsletter archive, and gated admin dashboard for The Build Log.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Copy env values:

```bash
cp .env.example .env.local
```

Run the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Admin:

```text
http://localhost:3000/login
```

## Database

The app requires Postgres. Base tables include:

- `users`
- `sessions`
- `contacts`
- `newsletter_issues`
- `newsletter_sends`
- `newsletter_events`
- `newsletter_warmup`

Run migrations against whichever database `DATABASE_URL` points to:

```bash
./node_modules/.bin/drizzle-kit migrate
```

Seed or reset an admin user:

```bash
ADMIN_SEED_EMAIL="you@example.com" ADMIN_SEED_PASSWORD="your-temp-password" pnpm db:seed-admin
```

## Railway Local Development

This project is linked to Railway project `aibm`, production service `website-lat`.

Railway service variables for `website-lat` may include:

```env
DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
RESEND_API_KEY=...
RESEND_WEBHOOK_SECRET=...
NEWSLETTER_FROM=The Build Log <newsletter@rs.aibuilders.mx>
NEWSLETTER_REPLY_TO=hola@aibuilders.mx
NEXT_PUBLIC_SITE_URL=https://aibuilders.mx
```

Important: `postgres.railway.internal` only resolves inside Railway. If you run `pnpm dev` on your laptop with that URL in `.env.local`, login/admin DB queries will fail or hit the wrong setup.

For local dev, use one of these:

1. A local Postgres URL in `.env.local`.
2. A Railway public/proxy Postgres URL in `.env.local`.
3. Railway SSH/service context for commands that must run inside Railway’s private network.

If you have a Railway public DB URL, set:

```env
DATABASE_URL=postgresql://...public...
```

Then:

```bash
./node_modules/.bin/drizzle-kit migrate
ADMIN_SEED_EMAIL="you@example.com" ADMIN_SEED_PASSWORD="your-temp-password" pnpm db:seed-admin
pnpm dev
```

## Railway Commands

Check linked project/service:

```bash
railway status
```

Run a command with Railway service variables:

```bash
railway run --service website-lat pnpm dev
```

Note: `railway run` injects variables locally. It does not make `postgres.railway.internal` resolvable from your laptop. If the injected `DATABASE_URL` uses the internal host, use a public/proxy DB URL locally or run the command inside the Railway service network.

Run a command inside the Railway web service network:

```bash
railway ssh --service website-lat sh -lc 'PATH=/mise/shims:/mise/installs/node/22.23.1/bin:$PATH ./node_modules/.bin/drizzle-kit migrate'
```

Seed admin inside Railway:

```bash
railway ssh --service website-lat sh -lc 'ADMIN_SEED_EMAIL="you@example.com" ADMIN_SEED_PASSWORD="your-temp-password" PATH=/mise/shims:/mise/installs/node/22.23.1/bin:$PATH pnpm db:seed-admin'
```

Run the queue worker locally with a reachable database:

```bash
pnpm worker
```

Run the queue worker with Railway variables:

```bash
railway run --service website-lat pnpm worker
```

## Newsletter Sending

Newsletter content is stored in Postgres first:

- `newsletter_issues.data` stores the structured issue content.
- `newsletter_sends` stores per-contact send state and Resend email IDs.
- `newsletter_events` stores first-party analytics events.

Resend is the delivery provider, not the source of truth.

Admin flow:

1. Build/edit issue in `/admin/newsletter/[id]`.
2. Send test via Resend directly.
3. Send real issue, which creates `newsletter_sends` rows and enqueues jobs.
4. Worker processes queued batches and calls Resend.

## Resend Webhooks

Production webhook endpoint:

```text
https://aibuilders.mx/api/resend/webhook
```

Set this in Railway:

```env
RESEND_WEBHOOK_SECRET=...
```

Subscribe the Resend webhook to:

- `email.delivered`
- `email.bounced`
- `email.complained`
- `email.failed`
- `email.suppressed`

These events are matched back to `newsletter_sends.resend_id` and recorded in `newsletter_events`.

## Verification

Common checks:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/eslint
```
