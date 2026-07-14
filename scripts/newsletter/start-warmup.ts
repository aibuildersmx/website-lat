// Start / stop / inspect a domain-warmup plan for an issue. The worker's pg-boss
// cron (every 30 min) then ramps the send automatically — no further action needed.
//
//   set -a && . ./.env.local && set +a   # or export DATABASE_URL inline
//
//   pnpm tsx scripts/newsletter/start-warmup.ts <issueId>                   # start (3-day ramp: 400,900 + rest)
//   pnpm tsx scripts/newsletter/start-warmup.ts <issueId> --caps 200,400,700 # custom ramp (4-day, conservative)
//   pnpm tsx scripts/newsletter/start-warmup.ts <issueId> --chunk 150     # emails per 30-min tick
//   pnpm tsx scripts/newsletter/start-warmup.ts --status                  # show active plan + progress
//   pnpm tsx scripts/newsletter/start-warmup.ts --stop                    # pause/stop the active plan
//
// Starting also (re)seeds the priority inboxes so they're in the DB and always
// go out in the first batch.

import { parseArgs } from "node:util";

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      caps: { type: "string" }, // comma-separated per-day caps, e.g. "200,400,700"
      chunk: { type: "string" }, // recipients per tick
      status: { type: "boolean", default: false },
      stop: { type: "boolean", default: false },
    },
  });

  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Run: set -a && . ./.env.local && set +a");
    process.exit(1);
  }

  const { db } = await import("../../lib/db/client");
  const schema = await import("../../lib/db/schema");
  const { desc, eq, sql } = await import("drizzle-orm");
  const { startWarmupPlan } = await import("../../lib/newsletter/warmup-start");
  const { newsletterIssues, newsletterSends, newsletterWarmup } = schema;

  // --- status ---------------------------------------------------------------
  if (values.status) {
    const [plan] = await db
      .select()
      .from(newsletterWarmup)
      .where(eq(newsletterWarmup.active, true))
      .orderBy(desc(newsletterWarmup.createdAt))
      .limit(1);
    if (!plan) {
      console.log("No hay warmup activo.");
      process.exit(0);
    }
    const [issue] = await db
      .select({ slug: newsletterIssues.slug, subject: newsletterIssues.subject, status: newsletterIssues.status })
      .from(newsletterIssues)
      .where(eq(newsletterIssues.id, plan.issueId))
      .limit(1);
    const counts = await db
      .select({ status: newsletterSends.status, n: sql<number>`count(*)::int` })
      .from(newsletterSends)
      .where(eq(newsletterSends.issueId, plan.issueId))
      .groupBy(newsletterSends.status);
    const by = (s: string) => counts.find((r) => r.status === s)?.n ?? 0;
    const dayIndex = Math.max(0, Math.floor((Date.now() - plan.startAt.getTime()) / 86400000));
    console.log(`Warmup activo — issue ${issue?.slug} "${issue?.subject}" (${issue?.status})`);
    console.log(`Caps por día: [${plan.dailyCaps.join(", ")}] luego resto | chunk ${plan.chunkSize}/tick`);
    console.log(`Inició: ${plan.startAt.toISOString()} | día actual: ${dayIndex}`);
    console.log(`Enviados: ${by("sent")} | pendientes: ${by("pending")} | fallidos: ${by("failed")}`);
    process.exit(0);
  }

  // --- stop -----------------------------------------------------------------
  if (values.stop) {
    const stopped = await db
      .update(newsletterWarmup)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(newsletterWarmup.active, true))
      .returning({ id: newsletterWarmup.id });
    console.log(stopped.length ? `Warmup pausado (${stopped.length} plan).` : "No había warmup activo.");
    process.exit(0);
  }

  // --- start ----------------------------------------------------------------
  const issueId = positionals[0];
  if (!issueId) {
    console.error("Usage: start-warmup.ts <issueId> [--caps 200,400,700] [--chunk 100] | --status | --stop");
    process.exit(1);
  }
  const [issue] = await db
    .select({ slug: newsletterIssues.slug, subject: newsletterIssues.subject })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, issueId))
    .limit(1);
  if (!issue) {
    console.error(`No existe un issue con id ${issueId}.`);
    process.exit(1);
  }

  // Default = aggressive-but-safe 3-day ramp (400 → 900 → rest). The domain is
  // already warm from issue #002, so this stays inside Resend's slope limits.
  // Pass --caps 200,400,700 for the conservative 4-day ramp.
  const caps = (values.caps ? values.caps.split(/[\s,]+/) : ["400", "900"])
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  const chunkSize = values.chunk ? Number.parseInt(values.chunk, 10) : 100;
  if (!caps.length) {
    console.error("--caps inválido. Ej: --caps 200,400,700");
    process.exit(1);
  }

  const plan = await startWarmupPlan(issueId, {
    dailyCaps: caps,
    chunkSize,
    replaceActive: true,
  });

  console.log(`✅ Warmup iniciado — issue ${issue.slug} "${issue.subject}"`);
  console.log(`   Plan ${plan.planId} | caps [${caps.join(", ")}] luego resto | chunk ${chunkSize}/tick (cada 30 min)`);
  console.log("   Inboxes semilla actualizados para el primer batch.");
  console.log(`   El worker arranca el envío en el próximo tick del cron (≤30 min).`);
  console.log(`   Pausar:  pnpm tsx scripts/newsletter/start-warmup.ts --stop`);
  console.log(`   Estado:  pnpm tsx scripts/newsletter/start-warmup.ts --status`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
