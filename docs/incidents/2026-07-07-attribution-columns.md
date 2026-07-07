# Incident: prod 500 — missing `contacts.attribution_*` columns

**Date:** 2026-07-07
**Service:** `aibuilders.lat` (Railway project `aibm`, env `production`)
**Symptom:** Server-side exception on page load. Error digest `4215289563`.
**Impact:** Site down (HTTP 500) for any page running the subscriber acquisition-channel query.

## Root cause

Commit `9cad6c5` ("Track subscriber acquisition sources") shipped code that reads
`attribution_medium` / `attribution_source` / `attribution_referrer` on `contacts`,
plus migration `drizzle/0004_daffy_ronan.sql` that adds those columns. The code
deployed but the columns never existed in prod, so every query failed with
Postgres `42703: column "attribution_medium" does not exist`.

The migration was **not** simply "unrun" — it was **unrunnable**:

- drizzle's migrator applies a migration only if its `_journal.json` `when`
  timestamp is **greater than the latest applied migration's** `created_at`.
- `0004_daffy_ronan` had `when = 1783440798377`, which is **earlier** than
  `0003_virtual_talk_dates` (`when = 1783463400000`).
- Once `0003` is applied, `0004` is forever "in the past" → `drizzle-kit migrate`
  skips it and reports success while doing nothing.

This affects **every** environment, including fresh ones (the migrator walks the
folder in order and, after applying `0003`, silently skips the older-timestamped
`0004`). Prod just happened to be where it bit us.

## Immediate remediation

Columns were added by hand against the app's own `DATABASE_URL` (reached from
inside the Railway network via `railway ssh --service aibuilders.lat`, because the
DB is only exposed on the internal host `*.railway.internal`). The statements are
idempotent (`ADD COLUMN IF NOT EXISTS`), so re-running is safe:

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_source        text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_medium        text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_campaign      text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_content       text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_term          text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_referrer      text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_landing_page  text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS attribution_captured_at   timestamptz;
CREATE INDEX IF NOT EXISTS contacts_attribution_source_idx   ON contacts (attribution_source);
CREATE INDEX IF NOT EXISTS contacts_attribution_medium_idx   ON contacts (attribution_medium);
CREATE INDEX IF NOT EXISTS contacts_attribution_campaign_idx ON contacts (attribution_campaign);
```

Site returned to HTTP 200 immediately after.

## Permanent fixes (in this repo)

1. **`drizzle/0004_daffy_ronan.sql`** — rewritten with `IF NOT EXISTS` on every
   `ADD COLUMN` / `CREATE INDEX`, so the migration is safe to (re)apply on any
   environment, including prod where the columns already exist.
2. **`drizzle/meta/_journal.json`** — `0004`'s `when` bumped to `1783463400001`
   (just after `0003`) so the migrator no longer skips it.
3. **`railway.json`** — added a `preDeployCommand` that runs
   `drizzle-kit migrate` before every release, so schema changes ship with the
   code instead of needing a manual step. Runs inside the Railway network, where
   the internal `DATABASE_URL` is reachable and `drizzle-kit` + the `drizzle/`
   folder are present in the built image.
4. **prod `__drizzle_migrations`** — `0004` recorded as applied
   (`created_at = 1783463400001`) so drizzle's state matches reality.

## Running migrations manually

The DB is internal-only, so migrations must run from inside the network:

```bash
railway ssh --service aibuilders.lat --environment production \
  'cd /app && node_modules/.bin/drizzle-kit migrate'
```

`pnpm db:migrate` from a laptop will **hang** — the local machine can't reach
`*.railway.internal`.

## Open follow-up (needs Ben)

Prod's `__drizzle_migrations` holds **10** rows while the repo only has **5**
migrations — the drizzle folder was re-baselined/squashed at some point but the
prod journal kept its original lineage. This didn't cause the outage, but the
journal and the repo are not a clean 1:1. Worth a deliberate reconcile
(re-baseline against prod) before the next schema change to avoid surprises.

## Guardrail

When generating migrations, make sure each new migration's `_journal.json` `when`
is greater than all existing ones. `drizzle-kit generate` normally handles this,
but a rebase/cherry-pick can reorder timestamps — if `migrate` ever reports
success but a column is missing, suspect out-of-order `when` values first.
