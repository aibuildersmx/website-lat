import { PgBoss } from "pg-boss";

// Queue names. The send-batch queue dead-letters into the DLQ once retries are
// exhausted so the issue can still finalize.
export const SEND_BATCH_QUEUE = "newsletter.send-batch";
export const SEND_BATCH_DLQ = "newsletter.send-batch-dead";
// Domain-warmup heartbeat: a pg-boss cron fires this; the worker handler stages
// the next ramped chunk of an active warmup plan. See lib/newsletter/warmup.ts.
export const WARMUP_TICK_QUEUE = "newsletter.warmup-tick";

export interface SendBatchJob {
  issueId: string;
  contactIds: string[];
}

let bossPromise: Promise<PgBoss> | null = null;

// Lazy singleton — shared by the web service (to enqueue) and the worker (to
// process). pg-boss is multi-instance safe; both connect to the same DATABASE_URL
// and pg-boss manages its own `pgboss` schema.
export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) bossPromise = startBoss();
  return bossPromise;
}

async function startBoss(): Promise<PgBoss> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const boss = new PgBoss({ connectionString });
  boss.on("error", (e: unknown) => console.error("[pg-boss]", e));
  await boss.start();

  // Idempotent queue setup. retryLimit/retryBackoff + deadLetter are queue
  // policies in pg-boss v12, so enqueue calls don't need per-send options.
  // The dead-letter queue must exist before the main queue references it.
  await boss.createQueue(SEND_BATCH_DLQ, {});
  await boss.createQueue(SEND_BATCH_QUEUE, {
    retryLimit: 5,
    retryBackoff: true,
    deadLetter: SEND_BATCH_DLQ,
  });
  // Warmup heartbeat queue. Single-attempt: a missed/failed tick just retries on
  // the next cron fire, so no retries/backlog needed.
  await boss.createQueue(WARMUP_TICK_QUEUE, { retryLimit: 0 });

  return boss;
}
