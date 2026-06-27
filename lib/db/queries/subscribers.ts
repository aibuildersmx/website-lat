import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";

const SOURCE = "public-signup";

/**
 * Upsert a public newsletter signup into the community contacts table. On
 * conflict we merge the source (deduped) and (re)enable the newsletter flag —
 * an explicit re-signup re-subscribes someone who previously opted out — while
 * preserving any existing name. `email` must already be normalized
 * (trimmed + lowercased) by the caller.
 */
export async function upsertSubscriber(email: string): Promise<void> {
  await db
    .insert(contacts)
    .values({
      email,
      sources: [SOURCE],
      newsletterSubscribed: true,
    })
    .onConflictDoUpdate({
      target: contacts.email,
      set: {
        sources: sql`(select array(select distinct e from unnest(${contacts.sources} || excluded.sources) e))`,
        newsletterSubscribed: true,
        updatedAt: sql`now()`,
      },
    });
}
