import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";

const SOURCE = "public-signup";

export interface SubscriberAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPage?: string;
}

/**
 * Upsert a public newsletter signup into the community contacts table. On
 * conflict we merge the source (deduped) and (re)enable the newsletter flag —
 * an explicit re-signup re-subscribes someone who previously opted out — while
 * preserving any existing name. `email` must already be normalized
 * (trimmed + lowercased) by the caller.
 */
export async function upsertSubscriber(
  email: string,
  attribution: SubscriberAttribution = {},
): Promise<void> {
  await db
    .insert(contacts)
    .values({
      email,
      sources: [SOURCE],
      newsletterSubscribed: true,
      newsletterSubscribedAt: sql`now()`,
      newsletterUnsubscribedAt: null,
      attributionSource: attribution.source,
      attributionMedium: attribution.medium,
      attributionCampaign: attribution.campaign,
      attributionContent: attribution.content,
      attributionTerm: attribution.term,
      attributionReferrer: attribution.referrer,
      attributionLandingPage: attribution.landingPage,
      attributionCapturedAt:
        attribution.source || attribution.medium || attribution.campaign || attribution.referrer
          ? sql`now()`
          : undefined,
    })
    .onConflictDoUpdate({
      target: contacts.email,
      set: {
        sources: sql`(select array(select distinct e from unnest(${contacts.sources} || excluded.sources) e))`,
        newsletterSubscribed: true,
        newsletterSubscribedAt: sql`case when ${contacts.newsletterSubscribed} then coalesce(${contacts.newsletterSubscribedAt}, now()) else now() end`,
        newsletterUnsubscribedAt: null,
        attributionSource: sql`coalesce(${contacts.attributionSource}, excluded.attribution_source)`,
        attributionMedium: sql`coalesce(${contacts.attributionMedium}, excluded.attribution_medium)`,
        attributionCampaign: sql`coalesce(${contacts.attributionCampaign}, excluded.attribution_campaign)`,
        attributionContent: sql`coalesce(${contacts.attributionContent}, excluded.attribution_content)`,
        attributionTerm: sql`coalesce(${contacts.attributionTerm}, excluded.attribution_term)`,
        attributionReferrer: sql`coalesce(${contacts.attributionReferrer}, excluded.attribution_referrer)`,
        attributionLandingPage: sql`coalesce(${contacts.attributionLandingPage}, excluded.attribution_landing_page)`,
        attributionCapturedAt: sql`coalesce(${contacts.attributionCapturedAt}, excluded.attribution_captured_at)`,
        updatedAt: sql`now()`,
      },
    });
}
