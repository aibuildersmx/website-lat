// Process an issue's failed/pending sends DIRECTLY from this machine — no queue,
// no Railway worker involved. Connects to the same Railway Postgres + Resend via
// .env.local, resets `failed` rows to `pending`, and sends them in throttled
// batches of 100 (≤ ~3 req/s, under Resend's 5 req/s limit). Idempotent: already
// `sent` recipients are never touched.
//
// Safe to run only when the pg-boss queue has no active jobs (otherwise the
// Railway worker could process the same rows concurrently). Bypasses the queue
// entirely, so it creates no new jobs.
//
//   set -a && . ./.env.local && set +a && pnpm tsx scripts/newsletter/send-local.ts <issueId>

import { parseArgs } from "node:util";

const THROTTLE_MS = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { limit: { type: "string" } },
  });
  const issueId = positionals[0];
  if (!issueId) {
    console.error("Usage: pnpm tsx scripts/newsletter/send-local.ts <issueId> [--limit N]");
    process.exit(1);
  }
  const lim = values.limit ? Number.parseInt(values.limit, 10) : undefined;
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Run: set -a && . ./.env.local && set +a");
    process.exit(1);
  }

  const { db } = await import("../../lib/db/client");
  const schema = await import("../../lib/db/schema");
  const { and, eq, inArray, sql } = await import("drizzle-orm");
  const { chunk } = await import("../../lib/newsletter/recipients");
  const { loadNewsletterConfig } = await import("../../lib/newsletter/resend");
  const { processSendBatch } = await import("../../lib/newsletter/send-batch");

  const cfg = loadNewsletterConfig(); // throws if Resend env missing
  const deps = { db, resend: cfg.resend, from: cfg.from, replyTo: cfg.replyTo };

  const query = db
    .select({ contactId: schema.newsletterSends.contactId })
    .from(schema.newsletterSends)
    .where(
      and(
        eq(schema.newsletterSends.issueId, issueId),
        eq(schema.newsletterSends.status, "failed"),
      ),
    );
  const failed = lim ? await query.limit(lim) : await query;
  if (!failed.length) {
    console.log("No hay envíos fallidos para procesar.");
    process.exit(0);
  }

  const ids = failed.map((r) => r.contactId);

  // Reset only the selected rows to pending (so --limit really sends just N).
  await db
    .update(schema.newsletterSends)
    .set({ status: "pending", error: null, updatedAt: new Date() })
    .where(
      and(
        eq(schema.newsletterSends.issueId, issueId),
        inArray(schema.newsletterSends.contactId, ids),
      ),
    );
  await db
    .update(schema.newsletterIssues)
    .set({ status: "sending", sentAt: null, updatedAt: new Date() })
    .where(eq(schema.newsletterIssues.id, issueId));

  const batches = chunk(ids);
  console.log(`Procesando ${ids.length} envíos en ${batches.length} batches (local, throttle ${THROTTLE_MS}ms)...`);

  let errs = 0;
  for (let i = 0; i < batches.length; i++) {
    try {
      await processSendBatch(deps, { issueId, contactIds: batches[i] });
      console.log(`  batch ${i + 1}/${batches.length} OK`);
    } catch (e) {
      errs++;
      console.error(`  batch ${i + 1}/${batches.length} ERROR:`, (e as Error).message);
    }
    await sleep(THROTTLE_MS);
  }

  const counts = await db
    .select({ status: schema.newsletterSends.status, n: sql<number>`count(*)::int` })
    .from(schema.newsletterSends)
    .where(eq(schema.newsletterSends.issueId, issueId))
    .groupBy(schema.newsletterSends.status);
  console.log("--- final ---");
  console.log(JSON.stringify(counts));
  console.log(errs ? `${errs} batches con error — re-corre el script para reintentarlos.` : "Todos los batches OK.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
