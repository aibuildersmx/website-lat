import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";

export interface Recipient {
  id: string;
  email: string;
  name: string | null;
}

// The newsletter audience is our own contacts table — `newsletterSubscribed`
// doubles as the suppression list (the unsubscribe route flips it to false).
export async function subscribedRecipients(): Promise<Recipient[]> {
  return db
    .select({ id: contacts.id, email: contacts.email, name: contacts.name })
    .from(contacts)
    .where(eq(contacts.newsletterSubscribed, true));
}

/** Split recipients into chunks for Resend's batch send (max 100 per call). */
export function chunk<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
