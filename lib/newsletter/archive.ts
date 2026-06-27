import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterIssues } from "@/lib/db/schema";

export interface ArchiveCard {
  slug: string;
  issueLabel: string;
  date: string;
  readingTime: string;
  title: string;
  subtitle: string;
}

// Public archive: the issues that were actually sent, newest first. Reads the
// denormalized fields out of each issue's canonical `data` JSON.
export async function listPublishedIssues(): Promise<ArchiveCard[]> {
  const rows = await db
    .select({ slug: newsletterIssues.slug, data: newsletterIssues.data })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.status, "sent"))
    .orderBy(desc(newsletterIssues.sentAt));
  return rows.map((r) => ({
    slug: r.slug,
    issueLabel: r.data.issueLabel,
    date: r.data.date,
    readingTime: r.data.readingTime,
    title: r.data.title,
    subtitle: r.data.subtitle,
  }));
}
