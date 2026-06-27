import {
  getBoss,
  SEND_BATCH_QUEUE,
  SEND_BATCH_DLQ,
  WARMUP_TICK_QUEUE,
  type SendBatchJob,
} from "@/lib/queue/boss";
import { db } from "@/lib/db/client";
import { loadNewsletterConfig } from "@/lib/newsletter/resend";
import { processSendBatch, failBatch } from "@/lib/newsletter/send-batch";
import { warmupTick } from "@/lib/newsletter/warmup";

// How often the warmup cron fires. With a 100-recipient chunk per tick, every
// 30 min ≈ up to 200 emails/hour — comfortably inside Resend's limits and the
// per-hour pacing deliverability guides recommend. The per-day cap (set in the
// warmup plan) is what actually bounds each day; this just spreads it out.
const WARMUP_CRON = "*/30 * * * *";

// Resend's rate limit is 5 requests/second. Each batch is ONE request (up to 100
// emails), so we process batches serially (localConcurrency: 1) and pause between
// them to stay comfortably under the limit — ~3 req/s.
const THROTTLE_MS = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const boss = await getBoss();
  const cfg = loadNewsletterConfig(); // fail fast if Resend env is missing

  await boss.work<SendBatchJob>(
    SEND_BATCH_QUEUE,
    { batchSize: 1, localConcurrency: 1 },
    async (jobs) => {
      for (const job of jobs) {
        await processSendBatch(
          { db, resend: cfg.resend, from: cfg.from, replyTo: cfg.replyTo },
          job.data,
        );
        await sleep(THROTTLE_MS); // throttle to stay under Resend's 5 req/s
      }
    },
  );

  await boss.work<SendBatchJob>(
    SEND_BATCH_DLQ,
    { batchSize: 1, localConcurrency: 1 },
    async (jobs) => {
      for (const job of jobs) {
        await failBatch(db, job.data);
      }
    },
  );

  // Warmup heartbeat: each tick stages the next ramped chunk of the active warmup
  // plan (if any). A no-op when no plan is active.
  await boss.work(WARMUP_TICK_QUEUE, { batchSize: 1, localConcurrency: 1 }, async () => {
    const res = await warmupTick(boss);
    if (res.status === "sent") {
      console.log(`[warmup] día ${res.dayIndex}: encolados ${res.count} (issue ${res.issueId})`);
    } else if (res.status === "finished") {
      console.log(`[warmup] completado: toda la lista encolada (issue ${res.issueId}).`);
    } else if (res.status === "day-complete") {
      console.log(`[warmup] día ${res.dayIndex} completo (${res.sentToday}/${res.cap}); esperando al siguiente día.`);
    }
  });

  // Register/refresh the cron. Idempotent — pg-boss upserts the schedule by queue name.
  await boss.schedule(WARMUP_TICK_QUEUE, WARMUP_CRON);

  console.log("[worker] newsletter queue worker running");
}

main().catch((e) => {
  console.error("[worker] fatal", e);
  process.exit(1);
});
