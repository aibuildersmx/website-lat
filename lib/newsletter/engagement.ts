import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterEvents, newsletterSends } from "@/lib/db/schema";

// Read-side aggregates over newsletter_events (first-party opens/clicks). Rates use
// delivered (`sent`) as the denominator. Opens/clicks are counted by DISTINCT contact
// so a recipient who opens five times counts once. Clicks are the trustworthy signal;
// opens are inflated by Apple Mail Privacy / Gmail image proxy — surface them as soft.

export interface EngagementSummary {
  sent: number; // recipients we delivered to (rate denominator)
  opens: number; // unique contacts who opened
  clicks: number; // unique contacts who clicked
  openRate: number; // 0..1
  clickRate: number; // 0..1
  hasData: boolean; // any open/click recorded yet
}

export async function engagementSummary(issueId: string): Promise<EngagementSummary> {
  const [{ sent }] = await db
    .select({ sent: sql<number>`count(*)::int` })
    .from(newsletterSends)
    .where(and(eq(newsletterSends.issueId, issueId), eq(newsletterSends.status, "sent")));

  const [{ opens }] = await db
    .select({ opens: sql<number>`count(distinct ${newsletterEvents.contactId})::int` })
    .from(newsletterEvents)
    .where(and(eq(newsletterEvents.issueId, issueId), eq(newsletterEvents.type, "open")));

  const [{ clicks }] = await db
    .select({ clicks: sql<number>`count(distinct ${newsletterEvents.contactId})::int` })
    .from(newsletterEvents)
    .where(and(eq(newsletterEvents.issueId, issueId), eq(newsletterEvents.type, "click")));

  return {
    sent,
    opens,
    clicks,
    openRate: sent ? opens / sent : 0,
    clickRate: sent ? clicks / sent : 0,
    hasData: opens > 0 || clicks > 0,
  };
}

export interface LinkClicks {
  url: string;
  clicks: number; // unique contacts who clicked this link
}

export async function topClickedLinks(issueId: string, limit = 5): Promise<LinkClicks[]> {
  const rows = await db
    .select({
      url: newsletterEvents.url,
      clicks: sql<number>`count(distinct ${newsletterEvents.contactId})::int`,
    })
    .from(newsletterEvents)
    .where(and(eq(newsletterEvents.issueId, issueId), eq(newsletterEvents.type, "click")))
    .groupBy(newsletterEvents.url)
    .orderBy(desc(sql`count(distinct ${newsletterEvents.contactId})`))
    .limit(limit);
  return rows
    .filter((r): r is { url: string; clicks: number } => Boolean(r.url))
    .map((r) => ({ url: r.url, clicks: r.clicks }));
}
