import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface SubscriberWindowMetric {
  label: string;
  count: number;
}

export interface SubscriberHistoryPoint {
  period: string;
  newSubscribers: number;
  cumulativeSubscribers: number;
}

export interface SubscriberMetrics {
  totalContacts: number;
  currentSubscribers: number;
  unsubscribedContacts: number;
  windows: SubscriberWindowMetric[];
  history: SubscriberHistoryPoint[];
}

export async function subscriberMetrics(): Promise<SubscriberMetrics> {
  const [summary] = await db.execute<{
    total_contacts: number;
    current_subscribers: number;
    unsubscribed_contacts: number;
    last_24h: number;
    last_7d: number;
    last_28d: number;
    last_1m: number;
    all_time: number;
  }>(sql`
    select
      count(*)::int as total_contacts,
      count(*) filter (where newsletter_subscribed)::int as current_subscribers,
      count(*) filter (where not newsletter_subscribed)::int as unsubscribed_contacts,
      count(*) filter (where newsletter_subscribed_at >= now() - interval '24 hours')::int as last_24h,
      count(*) filter (where newsletter_subscribed_at >= now() - interval '7 days')::int as last_7d,
      count(*) filter (where newsletter_subscribed_at >= now() - interval '28 days')::int as last_28d,
      count(*) filter (where newsletter_subscribed_at >= now() - interval '1 month')::int as last_1m,
      count(newsletter_subscribed_at)::int as all_time
    from contacts
  `);

  const historyRows = await db.execute<{
    period: string;
    new_subscribers: number;
    cumulative_subscribers: number;
  }>(sql`
    with monthly as (
      select
        date_trunc('month', newsletter_subscribed_at)::date as period,
        count(*)::int as new_subscribers
      from contacts
      where newsletter_subscribed_at is not null
      group by 1
    )
    select
      to_char(period, 'YYYY-MM') as period,
      new_subscribers,
      sum(new_subscribers) over (order by period rows unbounded preceding)::int as cumulative_subscribers
    from monthly
    order by period
  `);

  return {
    totalContacts: summary?.total_contacts ?? 0,
    currentSubscribers: summary?.current_subscribers ?? 0,
    unsubscribedContacts: summary?.unsubscribed_contacts ?? 0,
    windows: [
      { label: "24h", count: summary?.last_24h ?? 0 },
      { label: "7d", count: summary?.last_7d ?? 0 },
      { label: "28d", count: summary?.last_28d ?? 0 },
      { label: "1 mes", count: summary?.last_1m ?? 0 },
      { label: "Histórico", count: summary?.all_time ?? 0 },
    ],
    history: historyRows.map((row) => ({
      period: row.period,
      newSubscribers: row.new_subscribers,
      cumulativeSubscribers: row.cumulative_subscribers,
    })),
  };
}
