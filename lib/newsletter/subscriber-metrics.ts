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

export interface SubscriberAttributionMetric {
  label: string;
  count: number;
}

export interface RecentAttributedSubscriber {
  email: string;
  subscribedAt: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  landingPage: string | null;
}

export interface CompanyEmailMetric {
  label: string;
  domain: string;
  count: number;
}

export interface RecentCompanySubscriber {
  email: string;
  domain: string;
  company: string | null;
  subscribedAt: string | null;
}

export interface SubscriberMetrics {
  totalContacts: number;
  currentSubscribers: number;
  unsubscribedContacts: number;
  windows: SubscriberWindowMetric[];
  history: SubscriberHistoryPoint[];
  attribution: {
    byChannel: SubscriberAttributionMetric[];
    bySource: SubscriberAttributionMetric[];
    byCampaign: SubscriberAttributionMetric[];
    recent: RecentAttributedSubscriber[];
  };
  emailAnalytics: {
    workEmailSubscribers: number;
    personalEmailSubscribers: number;
    notableCompanySubscribers: number;
    topCompanyDomains: CompanyEmailMetric[];
    notableCompanies: CompanyEmailMetric[];
    recentCompanySubscribers: RecentCompanySubscriber[];
  };
}

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "privaterelay.appleid.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "hey.com",
  "mail.com",
  "zoho.com",
  "gmx.com",
  "fastmail.com",
];

function domainSql() {
  return sql<string>`lower(nullif(split_part(email, '@', 2), ''))`;
}

function personalDomainListSql() {
  return sql.join(
    PERSONAL_EMAIL_DOMAINS.map((domain) => sql`${domain}`),
    sql`, `,
  );
}

function notableCompanySql() {
  return sql`
    (
      values
        ('google.com', 'Google'),
        ('abc.xyz', 'Alphabet'),
        ('microsoft.com', 'Microsoft'),
        ('linkedin.com', 'LinkedIn'),
        ('amazon.com', 'Amazon'),
        ('aws.com', 'AWS'),
        ('meta.com', 'Meta'),
        ('facebook.com', 'Meta'),
        ('instagram.com', 'Instagram'),
        ('apple.com', 'Apple'),
        ('openai.com', 'OpenAI'),
        ('anthropic.com', 'Anthropic'),
        ('nvidia.com', 'NVIDIA'),
        ('tesla.com', 'Tesla'),
        ('spacex.com', 'SpaceX'),
        ('netflix.com', 'Netflix'),
        ('stripe.com', 'Stripe'),
        ('shopify.com', 'Shopify'),
        ('salesforce.com', 'Salesforce'),
        ('adobe.com', 'Adobe'),
        ('oracle.com', 'Oracle'),
        ('ibm.com', 'IBM'),
        ('uber.com', 'Uber'),
        ('airbnb.com', 'Airbnb'),
        ('spotify.com', 'Spotify'),
        ('databricks.com', 'Databricks'),
        ('snowflake.com', 'Snowflake'),
        ('cloudflare.com', 'Cloudflare'),
        ('github.com', 'GitHub'),
        ('gitlab.com', 'GitLab'),
        ('figma.com', 'Figma'),
        ('notion.so', 'Notion'),
        ('canva.com', 'Canva'),
        ('mercadolibre.com', 'Mercado Libre'),
        ('rappi.com', 'Rappi'),
        ('clip.mx', 'Clip'),
        ('nu.com.mx', 'Nubank'),
        ('nubank.com.br', 'Nubank')
    ) as notable(domain, company)
  `;
}

function channelSql() {
  return sql<string>`
    case
      when attribution_medium ilike any(array['%paid%', '%cpc%', '%ppc%', '%ad%', '%ads%'])
        then 'Paid ads'
      when attribution_medium ilike any(array['%social%', '%ugc%'])
        or attribution_source ilike any(array['%instagram%', '%linkedin%', '%twitter%', '%x.com%', '%facebook%', '%tiktok%', '%youtube%'])
        then 'Social / UGC'
      when attribution_medium ilike '%email%' then 'Email'
      when attribution_referrer is not null then 'Referral'
      when attribution_source is not null then 'Tagged'
      else 'Direct / unknown'
    end
  `;
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

  const channelRows = await db.execute<{ label: string; count: number }>(sql`
    select ${channelSql()} as label, count(*)::int as count
    from contacts
    where newsletter_subscribed_at is not null
    group by 1
    order by count desc, label asc
    limit 8
  `);

  const sourceRows = await db.execute<{ label: string; count: number }>(sql`
    select coalesce(nullif(attribution_source, ''), 'Direct / unknown') as label, count(*)::int as count
    from contacts
    where newsletter_subscribed_at is not null
    group by 1
    order by count desc, label asc
    limit 8
  `);

  const campaignRows = await db.execute<{ label: string; count: number }>(sql`
    select coalesce(nullif(attribution_campaign, ''), 'No campaign') as label, count(*)::int as count
    from contacts
    where newsletter_subscribed_at is not null
    group by 1
    order by count desc, label asc
    limit 8
  `);

  const recentRows = await db.execute<{
    email: string;
    subscribed_at: string | null;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    referrer: string | null;
    landing_page: string | null;
  }>(sql`
    select
      email,
      newsletter_subscribed_at::text as subscribed_at,
      attribution_source as source,
      attribution_medium as medium,
      attribution_campaign as campaign,
      attribution_referrer as referrer,
      attribution_landing_page as landing_page
    from contacts
    where newsletter_subscribed_at is not null
    order by newsletter_subscribed_at desc nulls last, created_at desc
    limit 12
  `);

  const [emailSummary] = await db.execute<{
    work_email_subscribers: number;
    personal_email_subscribers: number;
    notable_company_subscribers: number;
  }>(sql`
    with subscriber_domains as (
      select ${domainSql()} as domain
      from contacts
      where newsletter_subscribed_at is not null
    )
    select
      count(*) filter (
        where subscriber_domains.domain is not null
          and subscriber_domains.domain not in (${personalDomainListSql()})
      )::int as work_email_subscribers,
      count(*) filter (
        where subscriber_domains.domain is null
          or subscriber_domains.domain in (${personalDomainListSql()})
      )::int as personal_email_subscribers,
      count(*) filter (where notable.domain is not null)::int as notable_company_subscribers
    from subscriber_domains
    left join ${notableCompanySql()} on notable.domain = subscriber_domains.domain
  `);

  const topCompanyDomainRows = await db.execute<{
    label: string;
    domain: string;
    count: number;
  }>(sql`
    with subscriber_domains as (
      select ${domainSql()} as domain
      from contacts
      where newsletter_subscribed_at is not null
    )
    select domain as label, domain, count(*)::int as count
    from subscriber_domains
    where domain is not null and domain not in (${personalDomainListSql()})
    group by domain
    order by count desc, domain asc
  `);

  const notableCompanyRows = await db.execute<{
    label: string;
    domain: string;
    count: number;
  }>(sql`
    with subscriber_domains as (
      select ${domainSql()} as domain
      from contacts
      where newsletter_subscribed_at is not null
    )
    select notable.company as label, notable.domain, count(*)::int as count
    from subscriber_domains
    join ${notableCompanySql()} on notable.domain = subscriber_domains.domain
    group by notable.company, notable.domain
    order by count desc, notable.company asc
  `);

  const recentCompanyRows = await db.execute<{
    email: string;
    domain: string;
    company: string | null;
    subscribed_at: string | null;
  }>(sql`
    with subscriber_domains as (
      select
        email,
        newsletter_subscribed_at,
        created_at,
        ${domainSql()} as domain
      from contacts
      where newsletter_subscribed_at is not null
    )
    select
      email,
      subscriber_domains.domain,
      notable.company,
      newsletter_subscribed_at::text as subscribed_at
    from subscriber_domains
    left join ${notableCompanySql()} on notable.domain = subscriber_domains.domain
    where subscriber_domains.domain is not null
      and subscriber_domains.domain not in (${personalDomainListSql()})
    order by newsletter_subscribed_at desc nulls last, created_at desc
    limit 12
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
    attribution: {
      byChannel: channelRows.map((row) => ({ label: row.label, count: row.count })),
      bySource: sourceRows.map((row) => ({ label: row.label, count: row.count })),
      byCampaign: campaignRows.map((row) => ({ label: row.label, count: row.count })),
      recent: recentRows.map((row) => ({
        email: row.email,
        subscribedAt: row.subscribed_at,
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        referrer: row.referrer,
        landingPage: row.landing_page,
      })),
    },
    emailAnalytics: {
      workEmailSubscribers: emailSummary?.work_email_subscribers ?? 0,
      personalEmailSubscribers: emailSummary?.personal_email_subscribers ?? 0,
      notableCompanySubscribers: emailSummary?.notable_company_subscribers ?? 0,
      topCompanyDomains: topCompanyDomainRows.map((row) => ({
        label: row.label,
        domain: row.domain,
        count: row.count,
      })),
      notableCompanies: notableCompanyRows.map((row) => ({
        label: row.label,
        domain: row.domain,
        count: row.count,
      })),
      recentCompanySubscribers: recentCompanyRows.map((row) => ({
        email: row.email,
        domain: row.domain,
        company: row.company,
        subscribedAt: row.subscribed_at,
      })),
    },
  };
}
