// Run ONE warmup tick immediately instead of waiting for the worker's 30-min cron.
// Stages the next ramped chunk of the active plan and enqueues it onto the send
// queue (the Railway worker then delivers it). Handy right after starting a warmup
// to confirm the first batch goes out. Safe to run anytime: it respects the day cap
// and is idempotent (a no-op when there's no active plan or the day's cap is hit).
//
//   set -a && . ./.env.local && set +a && pnpm tsx scripts/newsletter/warmup-nudge.ts

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set. Run: set -a && . ./.env.local && set +a");
    process.exit(1);
  }
  const { getBoss } = await import("../../lib/queue/boss");
  const { warmupTick } = await import("../../lib/newsletter/warmup");
  const boss = await getBoss();
  const res = await warmupTick(boss);
  console.log(JSON.stringify(res));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
