# The Build Log Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `aibuilders-lat` from a static site into a Next.js 16 app that hosts the complete self-hosted "The Build Log" newsletter system ported from the `aibuilders` repo, deployed on Railway.

**Architecture:** Lift-and-shift the proven newsletter stack (Drizzle/Postgres DB, pg-boss queue + worker, Resend sending with domain warmup, first-party open/click tracking, admin composer) from `aibuilders` into `aibuilders-lat`. The static site's bespoke design (Geist + Instrument Serif, glass aesthetic in `styles.css`) is preserved by reimplementing the public pages as Next.js routes. Community/blog features are explicitly excluded.

**Tech Stack:** Next.js 16.1.6, React 19.2, TypeScript 5, Drizzle ORM 0.45 + postgres-js, pg-boss 12, Resend 6, Tailwind v4, bcryptjs, vitest 4, pnpm. Deploy on Railway (Postgres + web + worker).

## Source & destination repos

- **SOURCE (read-only, copy from):** `/Volumes/VELLENT USB/Sites/aibuilders` — referred to below as `$SRC`.
- **DEST (this repo):** `/Volumes/VELLENT USB/Sites/aibuilders-lat` — referred to as `$DEST`. All paths are relative to `$DEST` unless prefixed with `$SRC/`.

> This is a **port**, not greenfield. Most tasks copy a known-good file from `$SRC` and adjust. For ported files the "test" is: the build compiles and the ported vitest suite passes. Genuinely new or trimmed code (schema, configs, admin home, public archive, reskin) is shown inline.

## Global Constraints

- Package manager: **pnpm** (source uses `pnpm-lock.yaml`).
- Path alias: `@/*` → `./*` (tsconfig `paths`). Keep identical so ported imports resolve unchanged.
- Node/Next runtime: server (NOT static export). `output: export` must never be set.
- Excluded from scope, never port: `community_people` table, `app/(admin)/admin/comunidad/*`, `app/(admin)/admin/contactos/*`, `lib/community/*`, `lib/aiby/*`, `scripts/community/*`, blog (`content/blog`, `app/(blog)/*`, MDX), and env vars `AIBY_API_BASE` / `AIBY_API_KEY`.
- DB connection uses `postgres(connectionString, { prepare: false })` (Railway proxy requirement) — do not change.
- Resend rate limit: worker throttles to ~3 req/s (`THROTTLE_MS = 300`), warmup cron `*/30 * * * *` — copy verbatim.
- Locale of all UI copy: **Spanish (es)**.
- Railway connection/operations: use the new SSH interface **`railway.new`** (already authenticated). Prefer it for service ops.
- Preserve the existing design: `styles.css`, `favicon.svg`, `assets/`, fonts (Geist, Geist Mono, Instrument Serif).

---

## Phase 1 — Next.js conversion & design system

### Task 1: Scaffold Next.js app config and dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.example`, `drizzle.config.ts`, `vitest.config.ts`
- Reference (copy/trim from): `$SRC/` equivalents

**Interfaces:**
- Produces: a buildable Next.js project skeleton; `@/*` path alias; scripts `dev/build/start/worker/test/db:generate/db:migrate/db:seed-admin/newsletter:test-send`.

- [ ] **Step 1: Copy and trim `package.json`**

Copy `$SRC/package.json` → `$DEST/package.json`, then:
- Set `"name": "aibuilders-lat"`.
- Remove scripts `community:import`, `community:backfill` (community-only).
- Keep: `dev`, `build`, `start`, `worker`, `lint`, `test`, `db:generate`, `db:migrate`, `db:seed-admin`, `newsletter:test-send`.
- Remove dependencies used ONLY by excluded features (blog/community/3D/charts): `@mdx-js/loader`, `@mdx-js/react`, `@next/mdx`, `@types/mdx`, `gray-matter`, `remark-frontmatter`, `remark-gfm`, `@react-three/fiber`, `@react-three/postprocessing`, `three`, `@types/three`, `postprocessing`, `recharts`, `csv-parse`.
- Keep everything else (next, react, drizzle-orm, postgres, pg-boss, resend, bcryptjs, server-only, next-themes, lucide-react, framer-motion/motion, geist, tailwind stack, radix, class-variance-authority, clsx, tailwind-merge, @vercel/analytics, drizzle-kit, tsx, typescript, vitest, eslint, eslint-config-next, @tailwindcss/postcss, tw-animate-css, sharp).
- If a later task reports a missing import from a kept file, add that dep back rather than deleting the import.

- [ ] **Step 2: Copy config files verbatim, then trim**

Copy verbatim: `$SRC/tsconfig.json`, `$SRC/postcss.config.mjs`, `$SRC/eslint.config.mjs`, `$SRC/drizzle.config.ts`, `$SRC/vitest.config.ts`, `$SRC/.gitignore`.

For `next.config.ts`: create a trimmed version WITHOUT MDX and WITHOUT the blog redirects:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "ik.imagekit.io" }],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create `.env.example`**

```bash
# aibuilders-lat — The Build Log
# Copy to .env.local for dev; set as Railway service variables in prod.

# Database (web + worker). Railway Postgres connection string.
DATABASE_URL=

# Newsletter / Resend (web + worker)
RESEND_API_KEY=
NEWSLETTER_FROM=The Build Log <hola@aibuilders.lat>
NEWSLETTER_REPLY_TO=
# Base URL for unsubscribe/tracking links. Defaults to https://aibuilders.mx if unset.
NEXT_PUBLIC_SITE_URL=

# Admin seed (one-time, `pnpm db:seed-admin`)
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=
```

- [ ] **Step 4: Create `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
```

- [ ] **Step 5: Install and verify**

Run: `pnpm install`
Expected: completes without unmet-peer errors that block install. A lockfile `pnpm-lock.yaml` is generated.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json next.config.ts next-env.d.ts postcss.config.mjs eslint.config.mjs .gitignore .env.example drizzle.config.ts vitest.config.ts pnpm-lock.yaml
git commit -m "chore: scaffold Next.js app config for newsletter migration"
```

### Task 2: Port the design system and convert static pages to Next.js routes

**Files:**
- Create: `app/(site)/layout.tsx`, `app/(site)/page.tsx`, `app/(site)/talks/page.tsx`, `app/globals.css`, `lib/fonts.ts`, `components/theme-provider.tsx`
- Move: `styles.css` → imported via `app/globals.css`; `favicon.svg`, `assets/*` → `public/`
- Keep (delete originals after porting): `index.html`, `newsletters.html`, `talks.html`

**Interfaces:**
- Produces: a public site shell preserving the current design; routes `/` (home), `/talks`. (`/newsletters` archive comes in Task 9.)

- [ ] **Step 1: Move static assets into `public/`**

```bash
mkdir -p public
git mv favicon.svg public/favicon.svg
git mv assets public/assets
```

- [ ] **Step 2: Create `app/globals.css`**

Import the existing stylesheet so the bespoke design is preserved verbatim:

```css
@import "../styles.css";
```

Keep `styles.css` at repo root (referenced by the import). Do not rewrite it.

- [ ] **Step 3: Create `lib/fonts.ts`**

Source the same web fonts the static `<head>` used (Geist, Geist Mono, Instrument Serif) via `next/font/google`:

```ts
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const siteFontVariables = `${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`;
```

> If `styles.css` references font-families by name (e.g. `"Geist"`), add matching CSS variable aliases at the top of `app/globals.css` so the loaded fonts apply. Verify visually in Step 7.

- [ ] **Step 4: Create `app/(site)/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { siteFontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "AI Builders Latam — The Build Log",
  description:
    "The Build Log, el boletín semanal de IA para builders en Latinoamérica.",
  icons: { icon: "/favicon.svg" },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={siteFontVariables}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Port `index.html` → `app/(site)/page.tsx`**

Convert the `<body>` markup of `index.html` into JSX inside a `Home()` component: rename `class`→`className`, self-close void tags, move inline `<script>` (the `local-dev` host check) into a small client component or drop it if non-essential. The newsletter signup form in the hero is replaced by the `<NewsletterSignup />` component in Task 8 — for now leave a placeholder `<div data-signup-slot />` where the form was, with a code comment `{/* NewsletterSignup mounted in Task 8 */}`.

- [ ] **Step 6: Port `talks.html` → `app/(site)/talks/page.tsx`**

Same conversion approach. Pure presentational content; no dynamic data.

- [ ] **Step 7: Run the dev server and verify visually**

Run: `pnpm dev` then open `http://localhost:3000/` and `http://localhost:3000/talks`.
Expected: both pages render with the original fonts, layout, and styling intact (compare against opening the old `.html` files in a browser).

- [ ] **Step 8: Delete the static HTML originals and commit**

```bash
git rm index.html talks.html
git add app lib/fonts.ts public styles.css
git commit -m "feat: convert static site to Next.js routes, preserve design"
```
(`newsletters.html` is removed in Task 9 when the DB-backed archive replaces it.)

---

## Phase 2 — Database, newsletter libs, queue & worker

### Task 3: Port the DB layer with trimmed schema

**Files:**
- Create: `lib/db/client.ts`, `lib/db/schema.ts`
- Create: `drizzle/` migrations (regenerated)

**Interfaces:**
- Consumes: `DATABASE_URL`.
- Produces: `db` (Drizzle client), and table exports `contacts`, `users`, `sessions`, `newsletterIssues`, `newsletterSends`, `newsletterWarmup`, `newsletterEvents` plus their inferred types. **No `communityPeople`.**

- [ ] **Step 1: Copy `lib/db/client.ts` verbatim**

Copy `$SRC/lib/db/client.ts` → `$DEST/lib/db/client.ts` (no changes).

- [ ] **Step 2: Copy `lib/db/schema.ts` and remove the community table**

Copy `$SRC/lib/db/schema.ts` → `$DEST/lib/db/schema.ts`, then delete the `communityPeople` `pgTable` block (lines defining `export const communityPeople = pgTable("community_people", …)`) and its two type exports `CommunityPerson` / `NewCommunityPerson`. Keep `contacts`, `users`, `sessions`, and all four `newsletter*` tables exactly as-is (their relations don't reference `communityPeople`).

- [ ] **Step 3: Regenerate migrations from the trimmed schema**

Delete any copied `drizzle/*.sql` from source; generate fresh:

Run: `pnpm db:generate`
Expected: a single new `drizzle/0000_*.sql` containing `contacts`, `users`, `sessions`, `newsletter_issues`, `newsletter_sends`, `newsletter_warmup`, `newsletter_events` and NO `community_people`.

- [ ] **Step 4: Verify schema compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors originating from `lib/db/`. (Errors from not-yet-ported files are expected at this stage; confirm none mention `lib/db/schema` or `communityPeople`.)

- [ ] **Step 5: Commit**

```bash
git add lib/db drizzle
git commit -m "feat(db): port Drizzle schema (newsletter-only) + client"
```

### Task 4: Port newsletter libraries

**Files:**
- Create: all of `lib/newsletter/*` — `types.ts`, `issue.ts`, `render.ts`, `resend.ts`, `recipients.ts`, `send-batch.ts`, `warmup.ts`, `tracking.ts`, `engagement.ts`, `links.ts`, `icons.ts`, `unsubscribe.ts`
- Create: `lib/queue/boss.ts`

**Interfaces:**
- Consumes: `lib/db` (Task 3), env (`RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_REPLY_TO`, `NEXT_PUBLIC_SITE_URL`).
- Produces: the full sending/rendering/tracking API consumed by the worker, server actions, and routes — incl. `renderBuildLog`, `loadNewsletterConfig`, `MissingEnvError`, `subscribedRecipients`, `chunk`, `processSendBatch`, `failBatch`, `warmupTick`, `injectUnsubscribe`, `siteUrl`, `stripTracking`, `engagementSummary`, `topClickedLinks`, `emptyIssue`, the `Issue` type, and queue exports `getBoss`, `SEND_BATCH_QUEUE`, `SEND_BATCH_DLQ`, `WARMUP_TICK_QUEUE`, `SendBatchJob`.

- [ ] **Step 1: Copy the directories verbatim**

```bash
mkdir -p lib/newsletter lib/queue
cp "$SRC/lib/newsletter/"*.ts lib/newsletter/
cp "$SRC/lib/queue/boss.ts" lib/queue/boss.ts
```

These files import only from `@/lib/db/*`, `@/lib/newsletter/*`, `@/lib/queue/*`, and third-party packages already in `package.json` — no community/blog imports.

- [ ] **Step 2: Verify no out-of-scope imports leaked in**

Run: `grep -rE "community|aiby|/blog" lib/newsletter lib/queue`
Expected: no matches. If any appear, the file pulled an excluded dep — re-check against source and remove.

- [ ] **Step 3: Verify type-check of the newsletter libs**

Run: `pnpm exec tsc --noEmit`
Expected: no errors under `lib/newsletter/` or `lib/queue/`.

- [ ] **Step 4: Commit**

```bash
git add lib/newsletter lib/queue
git commit -m "feat(newsletter): port render/send/tracking libs + pg-boss queue"
```

### Task 5: Port the worker and verify the newsletter test suite

**Files:**
- Create: `worker.ts`
- Create: `tests/newsletter/*` (`build-log.test.ts`, `send-batch.test.ts`, `sends-idempotency.test.ts`, `unsubscribe.test.ts`, `fixtures/sample-issue.ts`), `tests/stubs/server-only.ts`

**Interfaces:**
- Consumes: `lib/queue/boss`, `lib/db/client`, `lib/newsletter/{resend,send-batch,warmup}` (Tasks 3–4).
- Produces: the long-running queue worker process (`pnpm worker`) and a green newsletter test suite.

- [ ] **Step 1: Copy `worker.ts` verbatim**

Copy `$SRC/worker.ts` → `$DEST/worker.ts` (no changes — imports resolve via `@/`).

- [ ] **Step 2: Copy the newsletter tests and shared stub**

```bash
mkdir -p tests/newsletter/fixtures tests/stubs
cp "$SRC/tests/newsletter/"*.ts tests/newsletter/
cp "$SRC/tests/newsletter/fixtures/sample-issue.ts" tests/newsletter/fixtures/
cp "$SRC/tests/stubs/server-only.ts" tests/stubs/
```

Do NOT copy `tests/community/*`, `tests/aiby/*`, `tests/admin/*`, `tests/db/community-people.test.ts`, or `tests/actions/community.test.ts`.

- [ ] **Step 3: Run the newsletter test suite**

Run: `pnpm test -- tests/newsletter`
Expected: PASS for all newsletter tests (rendering, send-batch, idempotency, unsubscribe). If a test imports `tests/stubs/server-only` via `vitest.config.ts` alias, confirm the alias copied in Task 1 still points there.

- [ ] **Step 4: Commit**

```bash
git add worker.ts tests/newsletter tests/stubs
git commit -m "feat(worker): port pg-boss worker + newsletter test suite"
```

---

## Phase 3 — Public pages, tracking & subscription

### Task 6: Port auth library and its tests

**Files:**
- Create: `lib/auth.ts`, `lib/auth/password.ts`, `lib/auth/session.ts`, `lib/auth/tokens.ts`, `lib/auth/users.ts`
- Create: `tests/auth/{password,session,tokens}.test.ts`

**Interfaces:**
- Consumes: `lib/db` (`users`, `sessions`).
- Produces: `getUser()`, `signOut()`, `signIn`/session helpers, `hashPassword` — consumed by admin layout, login, and `lib/actions/newsletter.ts` `gate()`.

- [ ] **Step 1: Copy auth lib and tests verbatim**

```bash
mkdir -p lib/auth tests/auth
cp "$SRC/lib/auth.ts" lib/auth.ts
cp "$SRC/lib/auth/"*.ts lib/auth/
cp "$SRC/tests/auth/"*.ts tests/auth/
```

- [ ] **Step 2: Run auth tests**

Run: `pnpm test -- tests/auth`
Expected: PASS (password hashing, session, tokens).

- [ ] **Step 3: Commit**

```bash
git add lib/auth lib/auth.ts tests/auth
git commit -m "feat(auth): port admin auth library + tests"
```

### Task 7: Port subscription server action and tracking/unsubscribe routes

**Files:**
- Create: `lib/actions/subscribe.ts` (public signup), `lib/actions/newsletter.ts` (admin actions)
- Create: `app/(site)/r/[token]/route.ts` (click tracking), `app/(site)/api/newsletter/o/[token]/route.ts` (open pixel), `app/(site)/unsubscribe/route.ts`, `app/api/newsletter/icons/[name]/route.ts`
- Create: `tests/actions/subscribe.test.ts`, `lib/rate-limit.ts` + `tests/lib/rate-limit.test.ts` (if `subscribe` depends on it)

**Interfaces:**
- Consumes: `lib/db`, `lib/newsletter/*`, `lib/auth`, `lib/queue/boss`.
- Produces: public `subscribe` action (used by `NewsletterSignup`), admin actions (`listIssues`, `getIssue`, `createIssue`, `saveIssue`, `renderPreview`, `sendTest`, `sendIssue`, `retryFailed`, `getIssueEngagement`, `getIssueProgress`), and the email tracking/unsubscribe HTTP routes.

- [ ] **Step 1: Identify and copy the subscribe action with its deps**

Inspect `$SRC/lib/actions/subscribe.ts` (the action backing public signup; referenced by `tests/actions/subscribe.test.ts`). Copy it plus any helper it imports that is in-scope (e.g. `lib/rate-limit.ts`, `lib/newsletter/recipients` query for upsert). Copy `tests/actions/subscribe.test.ts` and, if present, `$SRC/lib/rate-limit.ts` + `$SRC/tests/lib/rate-limit.test.ts`.

```bash
mkdir -p lib/actions tests/actions tests/lib
cp "$SRC/lib/actions/subscribe.ts" lib/actions/subscribe.ts
cp "$SRC/lib/actions/newsletter.ts" lib/actions/newsletter.ts
cp "$SRC/tests/actions/subscribe.test.ts" tests/actions/subscribe.test.ts
# copy lib/rate-limit.ts + its test only if subscribe.ts imports it:
[ -f "$SRC/lib/rate-limit.ts" ] && cp "$SRC/lib/rate-limit.ts" lib/rate-limit.ts
[ -f "$SRC/tests/lib/rate-limit.test.ts" ] && cp "$SRC/tests/lib/rate-limit.test.ts" tests/lib/rate-limit.test.ts
```

- [ ] **Step 2: Copy the HTTP routes verbatim**

```bash
mkdir -p "app/(site)/r/[token]" "app/(site)/api/newsletter/o/[token]" "app/(site)/unsubscribe" "app/api/newsletter/icons/[name]"
cp "$SRC/app/(site)/r/[token]/route.ts" "app/(site)/r/[token]/route.ts"
cp "$SRC/app/(site)/api/newsletter/o/[token]/route.ts" "app/(site)/api/newsletter/o/[token]/route.ts"
cp "$SRC/app/(site)/unsubscribe/route.ts" "app/(site)/unsubscribe/route.ts"
cp "$SRC/app/api/newsletter/icons/[name]/route.ts" "app/api/newsletter/icons/[name]/route.ts"
```

- [ ] **Step 3: Verify no excluded imports & type-check**

Run: `grep -rE "community|aiby" lib/actions app/\(site\)/r app/\(site\)/unsubscribe app/api/newsletter` then `pnpm exec tsc --noEmit`
Expected: no community/aiby matches; no type errors in these files.

- [ ] **Step 4: Run the subscribe (and rate-limit) tests**

Run: `pnpm test -- tests/actions/subscribe tests/lib/rate-limit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/actions app/\(site\)/r app/\(site\)/api app/\(site\)/unsubscribe app/api lib/rate-limit.ts tests/actions tests/lib
git commit -m "feat(newsletter): port subscribe action, admin actions, tracking/unsubscribe routes"
```

### Task 8: Wire the public newsletter signup component

**Files:**
- Create: `components/newsletter-signup.tsx`, `components/cta-section.tsx`, plus any small UI primitives they import (e.g. `components/ui/*`)
- Modify: `app/(site)/page.tsx` (mount `<NewsletterSignup />` at the slot left in Task 2)

**Interfaces:**
- Consumes: `subscribe` action (Task 7).
- Produces: a working signup form on the home page that inserts/updates a `contacts` row via the server action.

- [ ] **Step 1: Copy the signup components and their UI primitives**

```bash
cp "$SRC/components/newsletter-signup.tsx" components/newsletter-signup.tsx
cp "$SRC/components/cta-section.tsx" components/cta-section.tsx
```

Then resolve imports: open `components/newsletter-signup.tsx`, and for each `@/components/...` import it uses (e.g. `components/ui/button.tsx`, `lib/utils.ts`), copy that file from `$SRC` too. Repeat until `grep -o "@/[a-zA-Z0-9/_-]*" components/newsletter-signup.tsx` resolves to files that all exist.

- [ ] **Step 2: Mount the component in the home page**

In `app/(site)/page.tsx`, replace the `<div data-signup-slot />` placeholder with `<NewsletterSignup />` (import it). Keep the surrounding hero markup/styling from the original `index.html`.

- [ ] **Step 3: Type-check and dev-verify**

Run: `pnpm exec tsc --noEmit` then `pnpm dev` and submit the form on `/` with a test email.
Expected: compiles; form submits without runtime error. (DB write requires a live `DATABASE_URL`; if not yet connected, confirm the action is invoked and fails only on the DB call — full E2E happens in Phase 5.)

- [ ] **Step 4: Commit**

```bash
git add components app/\(site\)/page.tsx
git commit -m "feat: wire public NewsletterSignup into home page"
```

### Task 9: Build the public newsletter archive from the DB

**Files:**
- Create: `app/(site)/newsletters/page.tsx`, `lib/newsletter/archive.ts`
- Create: `tests/newsletter/archive.test.ts`
- Delete: `newsletters.html`

**Interfaces:**
- Consumes: `lib/db` (`newsletterIssues`), `Issue` type.
- Produces: `listPublishedIssues(): Promise<ArchiveCard[]>` where `ArchiveCard = { slug: string; issueLabel: string; date: string; readingTime: string; title: string; subtitle: string }`, derived from `newsletterIssues` rows with `status = "sent"`, newest first.

> The source repo has no public DB-backed archive (its `/newsletter` is a signup landing). This is new code; it replaces the static placeholder `newsletters.html`, reusing that file's markup/classes for the design.

- [ ] **Step 1: Write the failing test for `listPublishedIssues`**

```ts
// tests/newsletter/archive.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () =>
            Promise.resolve([
              {
                slug: "002",
                data: {
                  issueLabel: "Issue 002",
                  date: "15 Jun 2026",
                  readingTime: "6 min de lectura",
                  title: "The Build Log",
                  subtitle: "Resumen semanal",
                },
              },
            ]),
        }),
      }),
    }),
  },
}));

import { listPublishedIssues } from "@/lib/newsletter/archive";

describe("listPublishedIssues", () => {
  it("maps sent issues to archive cards", async () => {
    const cards = await listPublishedIssues();
    expect(cards).toEqual([
      {
        slug: "002",
        issueLabel: "Issue 002",
        date: "15 Jun 2026",
        readingTime: "6 min de lectura",
        title: "The Build Log",
        subtitle: "Resumen semanal",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm test -- tests/newsletter/archive`
Expected: FAIL with "Cannot find module '@/lib/newsletter/archive'".

- [ ] **Step 3: Implement `lib/newsletter/archive.ts`**

```ts
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterIssues } from "@/lib/db/schema";

export interface ArchiveCard {
  slug: string;
  issueLabel: string;
  date: string;
  readingTime: string;
  title: string;
  subtitle: string;
}

export async function listPublishedIssues(): Promise<ArchiveCard[]> {
  const rows = await db
    .select({ slug: newsletterIssues.slug, data: newsletterIssues.data })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.status, "sent"))
    .orderBy(desc(newsletterIssues.sentAt));
  return rows.map((r) => ({
    slug: r.slug,
    issueLabel: r.data.issueLabel,
    date: r.data.date,
    readingTime: r.data.readingTime,
    title: r.data.title,
    subtitle: r.data.subtitle,
  }));
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test -- tests/newsletter/archive`
Expected: PASS.

- [ ] **Step 5: Build `app/(site)/newsletters/page.tsx`**

Port the markup/classes from `newsletters.html` (the `archive-hero` + `archive-grid` sections) into a server component that calls `listPublishedIssues()` and renders one `<article class="archive-card">` per card. When the list is empty, render the existing "Próximamente" empty state. Mark the route dynamic (`export const dynamic = "force-dynamic"`) since it reads the DB.

- [ ] **Step 6: Delete the static archive and commit**

```bash
git rm newsletters.html
git add app/\(site\)/newsletters lib/newsletter/archive.ts tests/newsletter/archive.test.ts
git commit -m "feat: DB-backed public newsletter archive"
```

---

## Phase 4 — Admin (auth + newsletter composer)

### Task 10: Port admin shell, layouts, login (newsletter-only)

**Files:**
- Create: `app/(admin)/layout.tsx`, `app/(admin)/admin.css`, `app/(admin)/admin/layout.tsx`, `app/(admin)/admin/page.tsx` (redirect), `app/(admin)/login/page.tsx`
- Create: `app/(admin)/admin/components/admin-shell.tsx` (trimmed nav), `theme-toggle.tsx`, `stat-card.tsx`
- Create: `components/theme-provider.tsx`, `lib/fonts.ts` admin variant (`adminFontVariables`)

**Interfaces:**
- Consumes: `lib/auth` (`getUser`, `signOut`).
- Produces: a gated `/admin` area whose only section is The Build Log. `/admin` redirects to `/admin/newsletter`.

- [ ] **Step 1: Copy admin chrome**

```bash
mkdir -p "app/(admin)/admin/components" "app/(admin)/login"
cp "$SRC/app/(admin)/layout.tsx" "app/(admin)/layout.tsx"
cp "$SRC/app/(admin)/admin.css" "app/(admin)/admin.css" 2>/dev/null || true
cp "$SRC/app/(admin)/admin/layout.tsx" "app/(admin)/admin/layout.tsx"
cp "$SRC/app/(admin)/login/page.tsx" "app/(admin)/login/page.tsx"
cp "$SRC/app/(admin)/admin/components/admin-shell.tsx" "app/(admin)/admin/components/admin-shell.tsx"
cp "$SRC/app/(admin)/admin/components/theme-toggle.tsx" "app/(admin)/admin/components/theme-toggle.tsx"
cp "$SRC/app/(admin)/admin/components/stat-card.tsx" "app/(admin)/admin/components/stat-card.tsx"
cp "$SRC/components/theme-provider.tsx" components/theme-provider.tsx
```

- [ ] **Step 2: Add `adminFontVariables` to `lib/fonts.ts`**

The admin layout imports `adminFontVariables` from `@/lib/fonts`. Append an export reusing the same loaded fonts (or whichever the source admin used — check `$SRC/lib/fonts.ts`):

```ts
export const adminFontVariables = siteFontVariables;
```
(If `$SRC/lib/fonts.ts` defines distinct admin fonts, copy those font loaders instead and export their combined variables.)

- [ ] **Step 3: Trim the admin nav to newsletter-only**

In `app/(admin)/admin/components/admin-shell.tsx`, replace the `NAV` array with only the Build Log entry, and remove the now-unused `lucide-react` icon imports and the `@/lib/admin/avatars` import if it's community-specific (replace the avatar with the initial-letter fallback already in `AccountFooter`):

```ts
const NAV: { href: string; label: string; section: string; icon: typeof Mail; exact?: boolean }[] = [
  { href: "/admin/newsletter", label: "Newsletter", section: "The Build Log", icon: Mail, exact: false },
];
```

If removing `identityForEmail` is non-trivial, instead copy `$SRC/lib/admin/avatars.ts` verbatim (it's a static map, no community deps) and keep the import.

- [ ] **Step 4: Replace the community dashboard home with a redirect**

`$SRC`'s `app/(admin)/admin/page.tsx` depends on `lib/admin/metrics` (community + events). Replace it with a redirect:

```tsx
import { redirect } from "next/navigation";

export default function AdminHome() {
  redirect("/admin/newsletter");
}
```

Do NOT copy `dashboard-section.tsx` or `lib/admin/metrics.ts`.

- [ ] **Step 5: Resolve login page imports & type-check**

Open `app/(admin)/login/page.tsx`; copy any in-scope helper it imports (a `signIn` action under `lib/auth` or `lib/actions/auth.ts`). Then:

Run: `pnpm exec tsc --noEmit`
Expected: no errors under `app/(admin)/`. Fix unresolved imports by copying the named in-scope file from `$SRC`.

- [ ] **Step 6: Commit**

```bash
git add app/\(admin\) components/theme-provider.tsx lib/fonts.ts
git commit -m "feat(admin): port gated admin shell (newsletter-only) + login"
```

### Task 11: Port the newsletter composer and engagement panel

**Files:**
- Create: `app/(admin)/admin/newsletter/page.tsx`, `app/(admin)/admin/newsletter/[id]/page.tsx`
- Create: `app/(admin)/admin/newsletter/components/{issue-editor,editable-canvas,engagement-panel,icon-picker}.tsx`

**Interfaces:**
- Consumes: admin actions from `lib/actions/newsletter.ts` (Task 7), `lib/newsletter/*`.
- Produces: the `/admin/newsletter` list + `/admin/newsletter/[id]` composer (inline editing, preview iframe, test send, send/warmup, engagement panel).

- [ ] **Step 1: Copy the newsletter admin pages and components verbatim**

```bash
mkdir -p "app/(admin)/admin/newsletter/[id]" "app/(admin)/admin/newsletter/components"
cp "$SRC/app/(admin)/admin/newsletter/page.tsx" "app/(admin)/admin/newsletter/page.tsx"
cp "$SRC/app/(admin)/admin/newsletter/[id]/page.tsx" "app/(admin)/admin/newsletter/[id]/page.tsx"
cp "$SRC/app/(admin)/admin/newsletter/components/"*.tsx "app/(admin)/admin/newsletter/components/"
```

- [ ] **Step 2: Resolve imports & confirm no excluded deps**

Run: `grep -rE "community|aiby|/blog" app/\(admin\)/admin/newsletter` then `pnpm exec tsc --noEmit`
Expected: no matches; no type errors. Copy any remaining in-scope `@/components/ui/*` primitives the editor needs (e.g. select, tooltip) from `$SRC`.

- [ ] **Step 3: Production build check**

Run: `pnpm build`
Expected: build succeeds; routes `/admin/newsletter` and `/admin/newsletter/[id]` appear in the output. (Build may require dummy env; set `DATABASE_URL` to any non-empty string for the build if it reads env at module load.)

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/admin/newsletter
git commit -m "feat(admin): port newsletter composer + engagement panel"
```

### Task 12: Port operational scripts

**Files:**
- Create: `scripts/auth/seed-admin.ts`, `scripts/newsletter/*` (`import-issue.ts`, `seed-build-log.ts`, `send-local.ts`, `send-warmup.ts`, `start-warmup.ts`, `retry-failed.ts`, `test-send.ts`, `remove-contact.ts`, `warmup-nudge.ts`)

**Interfaces:**
- Consumes: `lib/db`, `lib/newsletter/*`, `lib/auth/password`.
- Produces: CLI tooling for seeding the admin user, importing/seeding issues, manual sends, and warmup control.

- [ ] **Step 1: Copy scripts verbatim**

```bash
mkdir -p scripts/auth scripts/newsletter
cp "$SRC/scripts/auth/seed-admin.ts" scripts/auth/seed-admin.ts
cp "$SRC/scripts/newsletter/"*.ts scripts/newsletter/
```

- [ ] **Step 2: Confirm no community imports**

Run: `grep -rE "community|aiby" scripts`
Expected: no matches.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors under `scripts/`.

- [ ] **Step 4: Commit**

```bash
git add scripts
git commit -m "chore(scripts): port admin-seed + newsletter CLI tooling"
```

---

## Phase 5 — Data migration & Railway deploy

### Task 13: Provision Railway services and run migrations

**Files:** none (infra) — record outcomes in `docs/superpowers/plans/2026-06-27-build-log-migration.md` checkboxes.

**Interfaces:**
- Produces: a Railway project with Postgres + web + worker, env vars set, schema applied.

- [ ] **Step 1: Create the Railway project and Postgres**

Using `railway.new` (the new SSH interface, already authenticated): create a project `aibuilders-lat`, add a **Postgres** database. Capture its `DATABASE_URL` (internal) and `DATABASE_PUBLIC_URL` (for local scripts).

- [ ] **Step 2: Create web + worker services from the repo**

Add two services pointing at this repo: **web** (start command `pnpm start`, build `pnpm build`) and **worker** (start command `pnpm worker`, no public domain). Define env as **shared variables** referenced by both: `DATABASE_URL`, `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_REPLY_TO`, `NEXT_PUBLIC_SITE_URL`. (`ADMIN_SEED_*` only needed once for the seed step.)

- [ ] **Step 3: Apply the DB schema**

With `DATABASE_URL` pointed at the Railway Postgres public proxy:

Run: `pnpm db:migrate`
Expected: the `drizzle/0000_*` migration applies; tables created. pg-boss creates its own `pgboss` schema on first worker boot.

- [ ] **Step 4: Seed the admin user**

Run (env set): `ADMIN_SEED_EMAIL=<you> ADMIN_SEED_PASSWORD=<pw> pnpm db:seed-admin`
Expected: "Created admin user <you>."

- [ ] **Step 5: Record service URLs/IDs in this plan and commit the doc update**

```bash
git add docs/superpowers/plans/2026-06-27-build-log-migration.md
git commit -m "docs: record Railway service details for build-log migration"
```

### Task 14: Migrate subscribers and issues from the old DB

**Files:** none (data) — optionally `scripts/migrate/import-legacy.ts` if a transform is needed.

**Interfaces:**
- Consumes: source Postgres (`$SRC` app's DATABASE_URL), destination Railway Postgres.
- Produces: `contacts` and `newsletter_issues` populated in the new DB; `newsletter_sends`/`newsletter_events` history optionally.

- [ ] **Step 1: Dump the in-scope tables from the source DB**

Get the source DB URL from the old app's Railway project (via `railway.new`). Dump only the in-scope tables, data-only, with column lists that match the trimmed schema:

Run:
```bash
pg_dump "$SOURCE_DATABASE_URL" --data-only --no-owner \
  -t contacts -t newsletter_issues \
  -f /tmp/buildlog-core.sql
```
Expected: a SQL file with `COPY`/`INSERT` for `contacts` + `newsletter_issues`.

- [ ] **Step 2: Load into the new DB**

Run: `psql "$DEST_DATABASE_URL" -f /tmp/buildlog-core.sql`
Expected: rows inserted. If `contacts` conflicts on the unique `email`, the dump's inserts for duplicates fail harmlessly — confirm counts with `psql "$DEST_DATABASE_URL" -c "select count(*) from contacts;"`.

- [ ] **Step 3 (optional): Migrate engagement history**

If desired, repeat the dump/load for `newsletter_sends` and `newsletter_events` (`-t newsletter_sends -t newsletter_events`). These reference `newsletter_issues.id` and `contacts.id`; load them AFTER Step 2 so FKs resolve. Skip if the IDs don't line up — history is non-blocking.

- [ ] **Step 4: Verify in the admin**

Open the deployed `/admin/newsletter`. Expected: the migrated issues appear in the list; subscriber count (via `subscribedRecipients`) is non-zero.

- [ ] **Step 5: Record counts in the plan doc and commit**

```bash
git add docs/superpowers/plans/2026-06-27-build-log-migration.md
git commit -m "docs: record data migration counts"
```

### Task 15: End-to-end smoke test of a real send

**Files:** none.

**Interfaces:**
- Produces: confirmation that the full pipeline (enqueue → worker → Resend → tracking) works in production.

- [ ] **Step 1: Verify domain & Resend config**

Confirm `NEWSLETTER_FROM` uses a Resend-verified domain and the worker service booted (logs show `[worker] newsletter queue worker running`).

- [ ] **Step 2: Send a test email from the composer**

In `/admin/newsletter/[id]`, use "enviar prueba" to your own address.
Expected: email arrives; the "Cancelar suscripción" link points at `<NEXT_PUBLIC_SITE_URL>/unsubscribe`.

- [ ] **Step 3: Verify tracking round-trips**

Open the test email and click a link. Then check `newsletter_events`:

Run: `psql "$DEST_DATABASE_URL" -c "select type, count(*) from newsletter_events group by type;"`
Expected: at least one `open` and one `click` row (note: prefetch/proxy may also generate opens).

- [ ] **Step 4: Confirm public pages live**

Open the web service domain `/`, `/newsletters`, `/talks`.
Expected: home signup works (inserts a contact), archive lists the migrated sent issues, talks renders.

- [ ] **Step 5: Mark migration complete**

Update the plan doc with a final "✅ Migration complete" note and commit.

```bash
git add docs/superpowers/plans/2026-06-27-build-log-migration.md
git commit -m "docs: build-log migration complete"
```

---

## Phase 5 outcome (actual)

Phase 5 turned out simpler than planned: the `aibm` Railway project (workspace
`yaya`) already had the infra. No dump/restore migration was needed.

- **Services** (env `production`): `website` (old, `aibuildersmx/website-v2`),
  `newsletter-worker` (old repo), `website-lat` (this repo,
  `aibuildersmx/website-lat`), `database` (shared Postgres), `aiby-bridge`.
- **Shared `database`** already holds the data: 2,246 contacts (2,211 subscribed),
  3 issues (all `status=sent`), 2 admin users. So the existing admin login works,
  and the public archive renders the 3 real issues. **No seeding, no migration.**
- **Do NOT run `pnpm db:migrate`** against the shared DB — the tables already exist
  (managed by the old app's migrations). The regenerated `drizzle/0000_*` here is
  only for a from-scratch DB.
- **`website-lat` variables** set as Railway references (no secret copying):
  `DATABASE_URL=${{database.DATABASE_URL}}`,
  `RESEND_API_KEY=${{website.RESEND_API_KEY}}`,
  `NEWSLETTER_FROM=${{website.NEWSLETTER_FROM}}`,
  `NEWSLETTER_REPLY_TO=${{website.NEWSLETTER_REPLY_TO}}`,
  `NEXT_PUBLIC_SITE_URL=https://aibuilders.lat`.
- **Deploy:** pushed `main` → `website-lat` rebuilt → deployment `SUCCESS`.
  Live verification: `/` (pill signup) 200, `/newsletters` renders the 3 DB issues,
  `/login` 200, `/admin` → 307 to `/login`, `/unsubscribe` 200, icons route 200.
- **Worker note:** `newsletter-worker` still runs the OLD repo's code against the
  shared DB + pg-boss queue, so sends enqueued from the new admin are processed.
  Optional follow-up: repoint `newsletter-worker` to `aibuildersmx/website-lat`.

### ✅ Migration complete (deployed & verified)

Remaining manual smoke test (needs admin login — Ricardo):
1. Log in at https://aibuilders.lat/login with the existing admin creds.
2. Open an issue in `/admin/newsletter/[id]` → "enviar prueba" to your own email.
3. Open + click the email; confirm rows land in `newsletter_events`.

## Self-review notes

- **Spec coverage:** every spec section maps to a task — conversion/design (T1–2), DB trim (T3), newsletter libs/queue/worker (T4–5), auth (T6), subscribe+tracking+admin actions (T7), public signup (T8), DB-backed archive (T9, new work flagged in spec), admin newsletter-only (T10–11), scripts (T12), Railway deploy (T13), data migration contacts+issues with optional history (T14), smoke test (T15).
- **Exclusions enforced** in Global Constraints and re-checked via `grep` gates in T4, T7, T11, T12.
- **Open verification points** (resolve during execution, not blockers): exact import set of `lib/actions/subscribe.ts` (T7 S1), login `signIn` action location (T10 S5), admin font definition in `$SRC/lib/fonts.ts` (T10 S2), and `styles.css` font-family aliasing (T2 S3). Each task instructs copying the named in-scope dependency from `$SRC` and re-running `tsc`.
