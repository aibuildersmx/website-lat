// Warmup sender: deliver an issue to the FULL subscriber list in escalating
// daily batches instead of one 2,000+ blast — the safe way to protect sender
// reputation on Gmail/Yahoo (a cold blast is what lands a domain in spam).
//
// Each run sends the NEXT N subscribers who have no send row yet for this issue,
// ordered by how long they've been members (oldest first ≈ most engaged). It's
// fully resumable and idempotent: re-running never re-mails anyone, and a crash
// mid-run just leaves rows `pending` for the next run to finish.
//
// Sends DIRECTLY from this machine (no pg-boss queue / Railway worker), throttled
// under Resend's rate limit. Run it once per day, raising --limit as you ramp.
//
//   set -a && . ./.env.local && set +a   # or export DATABASE_URL/RESEND_* inline
//
//   pnpm tsx scripts/newsletter/send-warmup.ts <issueId> --status      # just show progress
//   pnpm tsx scripts/newsletter/send-warmup.ts <issueId> --limit 100   # send next 100
//   pnpm tsx scripts/newsletter/send-warmup.ts <issueId> --limit 100 --dry   # preview, no send
//
// Suggested ramp for ~2,200 contacts (run one line per day):
//   día 1: --limit 100   · día 2: --limit 250  · día 3: --limit 500
//   día 4: --limit 800   · día 5: --limit 9999 (resto)
// Watch Resend's dashboard for bounces/complaints before raising the next day.

import { parseArgs } from "node:util";

const THROTTLE_MS = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      limit: { type: "string" },
      status: { type: "boolean", default: false },
      dry: { type: "boolean", default: false },
    },
  });
  const issueId = positionals[0];
  if (!issueId) {
    console.error(
      "Usage: pnpm tsx scripts/newsletter/send-warmup.ts <issueId> [--limit N | --status] [--dry]",
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Run: set -a && . ./.env.local && set +a");
    process.exit(1);
  }

  const { db } = await import("../../lib/db/client");
  const schema = await import("../../lib/db/schema");
  const { and, asc, eq, notExists, sql } = await import("drizzle-orm");
  const { chunk } = await import("../../lib/newsletter/recipients");
  const { loadNewsletterConfig } = await import("../../lib/newsletter/resend");
  const { processSendBatch } = await import("../../lib/newsletter/send-batch");

  const { contacts, newsletterIssues, newsletterSends } = schema;

  // Confirm the issue exists and is sendable.
  const [issue] = await db
    .select({ slug: newsletterIssues.slug, subject: newsletterIssues.subject, status: newsletterIssues.status })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, issueId))
    .limit(1);
  if (!issue) {
    console.error(`No existe un issue con id ${issueId}.`);
    process.exit(1);
  }

  // Progress so far: how many of the subscribed audience already have a send row.
  const [{ subscribed }] = await db
    .select({ subscribed: sql<number>`count(*)::int` })
    .from(contacts)
    .where(eq(contacts.newsletterSubscribed, true));
  const sentCounts = await db
    .select({ status: newsletterSends.status, n: sql<number>`count(*)::int` })
    .from(newsletterSends)
    .where(eq(newsletterSends.issueId, issueId))
    .groupBy(newsletterSends.status);
  const by = (s: string) => sentCounts.find((r) => r.status === s)?.n ?? 0;
  const sent = by("sent");
  const pending = by("pending");
  const failed = by("failed");
  const queuedOrDone = sent + pending + failed;
  const remaining = Math.max(0, subscribed - queuedOrDone);

  console.log(`Issue ${issue.slug} — "${issue.subject}" (status: ${issue.status})`);
  console.log(`Suscritos: ${subscribed} | enviados: ${sent} | pendientes: ${pending} | fallidos: ${failed} | sin tocar: ${remaining}`);

  if (values.status) process.exit(0);

  const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
  if (!limit || limit < 1) {
    console.error("Falta --limit N (o usa --status para solo ver progreso).");
    process.exit(1);
  }

  // Pick the next N subscribers with NO send row yet for this issue, oldest first.
  const next = await db
    .select({ id: contacts.id, email: contacts.email })
    .from(contacts)
    .where(
      and(
        eq(contacts.newsletterSubscribed, true),
        notExists(
          db
            .select({ x: sql`1` })
            .from(newsletterSends)
            .where(
              and(
                eq(newsletterSends.issueId, issueId),
                eq(newsletterSends.contactId, contacts.id),
              ),
            ),
        ),
      ),
    )
    .orderBy(asc(contacts.createdAt))
    .limit(limit);

  if (!next.length) {
    console.log("No quedan suscriptores sin enviar. ✅ Lista completa.");
    process.exit(0);
  }

  console.log(`\nSiguiente tanda: ${next.length} destinatarios.`);
  if (values.dry) {
    console.log("(--dry) No se envía nada. Primeros 5:");
    next.slice(0, 5).forEach((r) => console.log(`  - ${r.email}`));
    process.exit(0);
  }

  const cfg = loadNewsletterConfig(); // throws if Resend env missing
  const deps = { db, resend: cfg.resend, from: cfg.from, replyTo: cfg.replyTo };

  // Stage rows as pending, mark the issue sending.
  const ids = next.map((r) => r.id);
  await db
    .insert(newsletterSends)
    .values(ids.map((contactId) => ({ issueId, contactId, status: "pending" as const })))
    .onConflictDoNothing({ target: [newsletterSends.issueId, newsletterSends.contactId] });
  await db
    .update(newsletterIssues)
    .set({ status: "sending", sentAt: null, updatedAt: new Date() })
    .where(eq(newsletterIssues.id, issueId));

  const batches = chunk(ids);
  console.log(`Enviando en ${batches.length} batch(es) de ≤100 (throttle ${THROTTLE_MS}ms)...`);
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

  const newRemaining = remaining - next.length;
  console.log("--- fin de la tanda ---");
  console.log(errs ? `${errs} batch(es) con error — re-corre el script para reintentarlos.` : "Todos los batches OK.");
  console.log(`Restan ~${Math.max(0, newRemaining)} suscriptores sin enviar. Sube --limit mañana.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
