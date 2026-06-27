// Re-enqueue the failed sends of an issue through the real queue. Mirrors the
// admin "Reintentar fallidos" action (lib/actions/newsletter.ts → retryFailed)
// as a CLI for ops. Idempotent: only `failed` rows are reset to `pending` and
// re-enqueued; already-`sent` recipients are never touched (no duplicates).
//
//   # retry all failed
//   set -a && . ./.env.local && set +a && pnpm tsx scripts/newsletter/retry-failed.ts <issueId>
//   # retry only the first N (canary)
//   ... retry-failed.ts <issueId> --limit 100

import { parseArgs } from "node:util";

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { limit: { type: "string" } },
  });
  const issueId = positionals[0];
  if (!issueId) {
    console.error("Usage: pnpm tsx scripts/newsletter/retry-failed.ts <issueId> [--limit N]");
    process.exit(1);
  }
  const lim = values.limit ? Number.parseInt(values.limit, 10) : undefined;

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Run: set -a && . ./.env.local && set +a");
    process.exit(1);
  }

  const { db } = await import("../../lib/db/client");
  const schema = await import("../../lib/db/schema");
  const { and, eq, inArray } = await import("drizzle-orm");
  const { chunk } = await import("../../lib/newsletter/recipients");
  const { getBoss, SEND_BATCH_QUEUE } = await import("../../lib/queue/boss");

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
    console.log("No hay envíos fallidos para reintentar.");
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

  const boss = await getBoss();
  let jobs = 0;
  for (const group of chunk(ids)) {
    await boss.send(SEND_BATCH_QUEUE, { issueId, contactIds: group });
    jobs++;
  }

  console.log(`Reintentando ${ids.length} envíos en ${jobs} batches. El worker los drena throttleado.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
