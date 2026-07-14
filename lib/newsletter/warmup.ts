import type { PgBoss } from "pg-boss";
import { and, asc, eq, gte, notExists, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, newsletterEvents, newsletterIssues, newsletterSends, newsletterWarmup } from "@/lib/db/schema";
import { SEND_BATCH_QUEUE } from "@/lib/queue/boss";
import { chunk } from "./recipients";

const DAY_MS = 24 * 60 * 60 * 1000;

// Contacts tagged with this always go out in the very first batch of every warmup
// (seed inboxes we control — they open/engage, which warms reputation, and they
// confirm delivery early). See scripts/newsletter/seed-contacts.ts.
export const SEED_TAG = "newsletter-seed";

export type WarmupTickResult =
  | { status: "idle" } // no active warmup
  | { status: "day-complete"; dayIndex: number; sentToday: number; cap: number }
  | { status: "finished"; issueId: string } // whole list sent → deactivated
  | { status: "sent"; issueId: string; dayIndex: number; count: number };

// Per-day cap for a given day index. Once we run past the configured array, the
// rest of the list goes out uncapped (`Infinity`) — the final "send the rest" day.
function capForDay(caps: number[], dayIndex: number): number {
  return dayIndex < caps.length ? caps[dayIndex] : Number.POSITIVE_INFINITY;
}

/**
 * One warmup step. Reads the single active warmup plan, figures out how many more
 * recipients today's cap allows, stages that many un-sent subscribers, and enqueues
 * them onto the existing send-batch queue (so the normal worker delivers them).
 *
 * Idempotent and self-throttling: it never exceeds the day's cap, only ever picks
 * recipients with no send row yet, and deactivates the plan once the list is done.
 */
export async function warmupTick(boss: PgBoss): Promise<WarmupTickResult> {
  const [plan] = await db
    .select()
    .from(newsletterWarmup)
    .where(eq(newsletterWarmup.active, true))
    .orderBy(asc(newsletterWarmup.createdAt))
    .limit(1);
  if (!plan) return { status: "idle" };

  const now = Date.now();
  const dayIndex = Math.max(0, Math.floor((now - plan.startAt.getTime()) / DAY_MS));
  const dayStart = new Date(plan.startAt.getTime() + dayIndex * DAY_MS);
  const cap = capForDay(plan.dailyCaps, dayIndex);

  // How many we've already staged within today's rolling 24h window.
  const [{ sentToday }] = await db
    .select({ sentToday: sql<number>`count(*)::int` })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.issueId, plan.issueId),
        gte(newsletterSends.createdAt, dayStart),
      ),
    );

  if (sentToday >= cap) {
    return { status: "day-complete", dayIndex, sentToday, cap };
  }

  const quotaLeft = cap === Number.POSITIVE_INFINITY ? plan.chunkSize : Math.min(plan.chunkSize, cap - sentToday);

  // Next un-sent subscribers, longest-standing first (best engagement proxy we have).
  const next = await db
    .select({ id: contacts.id })
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
                eq(newsletterSends.issueId, plan.issueId),
                eq(newsletterSends.contactId, contacts.id),
              ),
            ),
        ),
      ),
    )
    // Order: seed contacts first (always in the first batch), then contacts who
    // engaged with any prior issue (open/click — warms reputation faster), then
    // longest-standing. Engagement ordering kicks in once we have event data.
    .orderBy(
      sql`(${SEED_TAG} = any(${contacts.tags})) desc`,
      sql`(exists (select 1 from ${newsletterEvents} where ${newsletterEvents.contactId} = ${contacts.id})) desc`,
      asc(contacts.createdAt),
    )
    .limit(quotaLeft);

  if (!next.length) {
    // Whole subscribed list has a send row → warmup is done. Stop the plan.
    await db
      .update(newsletterWarmup)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(newsletterWarmup.id, plan.id));
    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*)::int` })
      .from(newsletterSends)
      .where(and(eq(newsletterSends.issueId, plan.issueId), eq(newsletterSends.status, "pending")));
    if (pending === 0) {
      await db
        .update(newsletterIssues)
        .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
        .where(eq(newsletterIssues.id, plan.issueId));
    }
    return { status: "finished", issueId: plan.issueId };
  }

  const ids = next.map((r) => r.id);
  await db
    .insert(newsletterSends)
    .values(ids.map((contactId) => ({ issueId: plan.issueId, contactId, status: "pending" as const })))
    .onConflictDoNothing({ target: [newsletterSends.issueId, newsletterSends.contactId] });
  await db
    .update(newsletterIssues)
    .set({ status: "sending", sentAt: null, updatedAt: new Date() })
    .where(eq(newsletterIssues.id, plan.issueId));

  for (const group of chunk(ids)) {
    await boss.send(SEND_BATCH_QUEUE, { issueId: plan.issueId, contactIds: group });
  }

  return { status: "sent", issueId: plan.issueId, dayIndex, count: ids.length };
}
