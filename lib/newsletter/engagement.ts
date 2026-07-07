import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, newsletterEvents, newsletterIssues, newsletterSends } from "@/lib/db/schema";

// Read-side aggregates over newsletter_events (first-party opens/clicks). Rates use
// delivered (`sent`) as the denominator. Opens/clicks are counted by DISTINCT contact
// so a recipient who opens five times counts once. Clicks are the trustworthy signal;
// opens are inflated by Apple Mail Privacy / Gmail image proxy — surface them as soft.

export interface EngagementSummary {
  sent: number; // recipients we delivered to (rate denominator)
  opens: number; // unique contacts who opened
  clicks: number; // unique contacts who clicked
  unsubscribes: number; // unique contacts who unsubscribed from this issue
  bounces: number; // unique contacts with bounce events, once Resend webhooks are wired
  complaints: number; // unique contacts with spam/complaint events, once Resend webhooks are wired
  newSubscribers: number; // contacts acquired after this issue, before the next sent issue
  openRate: number; // 0..1
  clickRate: number; // 0..1
  unsubscribeRate: number; // 0..1
  bounceRate: number; // 0..1
  complaintRate: number; // 0..1
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

  const [{ unsubscribes }] = await db
    .select({ unsubscribes: sql<number>`count(distinct ${newsletterEvents.contactId})::int` })
    .from(newsletterEvents)
    .where(and(eq(newsletterEvents.issueId, issueId), eq(newsletterEvents.type, "unsubscribe")));

  const [{ bounces }] = await db
    .select({ bounces: sql<number>`count(distinct ${newsletterEvents.contactId})::int` })
    .from(newsletterEvents)
    .where(and(eq(newsletterEvents.issueId, issueId), eq(newsletterEvents.type, "bounce")));

  const [{ complaints }] = await db
    .select({ complaints: sql<number>`count(distinct ${newsletterEvents.contactId})::int` })
    .from(newsletterEvents)
    .where(and(eq(newsletterEvents.issueId, issueId), eq(newsletterEvents.type, "complaint")));

  const [issue] = await db
    .select({ sentAt: newsletterIssues.sentAt })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, issueId))
    .limit(1);

  let newSubscribers = 0;
  if (issue?.sentAt) {
    const sentAt = issue.sentAt.toISOString();
    const [nextIssue] = await db
      .select({ sentAt: newsletterIssues.sentAt })
      .from(newsletterIssues)
      .where(sql`${newsletterIssues.sentAt} > ${sentAt}::timestamptz`)
      .orderBy(asc(newsletterIssues.sentAt))
      .limit(1);

    const upperBound = nextIssue?.sentAt
      ? sql`and ${contacts.newsletterSubscribedAt} < ${nextIssue.sentAt.toISOString()}::timestamptz`
      : sql``;
    const [row] = await db
      .select({
        newSubscribers: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .where(sql`${contacts.newsletterSubscribedAt} >= ${sentAt}::timestamptz ${upperBound}`);
    newSubscribers = row.newSubscribers;
  }

  return {
    sent,
    opens,
    clicks,
    unsubscribes,
    bounces,
    complaints,
    newSubscribers,
    openRate: sent ? opens / sent : 0,
    clickRate: sent ? clicks / sent : 0,
    unsubscribeRate: sent ? unsubscribes / sent : 0,
    bounceRate: sent ? bounces / sent : 0,
    complaintRate: sent ? complaints / sent : 0,
    hasData: opens > 0 || clicks > 0 || unsubscribes > 0 || bounces > 0 || complaints > 0,
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
