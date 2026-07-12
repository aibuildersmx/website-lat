import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterIssues } from "@/lib/db/schema";
import type { Issue } from "@/lib/newsletter/types";

export interface ArchiveCard {
  slug: string;
  issueLabel: string;
  date: string;
  readingTime: string;
  title: string;
  subtitle: string;
}

export interface PublishedIssue {
  slug: string;
  data: Issue;
}

export interface PublishedFeedIssue {
  slug: string;
  subject: string;
  preview: string;
  subtitle: string;
  sentAt: Date | null;
}

// Public archive: sent issues explicitly marked for the public archive, newest
// first. Reads the denormalized fields out of each issue's canonical `data` JSON.
export async function listPublishedIssues(): Promise<ArchiveCard[]> {
  const rows = await db
    .select({
      slug: newsletterIssues.slug,
      data: newsletterIssues.data,
      sentAt: newsletterIssues.sentAt,
    })
    .from(newsletterIssues)
    .where(
      and(
        eq(newsletterIssues.status, "sent"),
        sql`coalesce((${newsletterIssues.data}->>'archivePublished')::boolean, true) = true`,
      ),
    )
    .orderBy(desc(newsletterIssues.sentAt));
  return rows.map((r) => {
    const content = r.data.spanish ?? r.data;
    return {
      slug: r.slug,
      issueLabel: content.issueLabel,
      date: r.sentAt ? formatArchiveSentDate(r.sentAt) : content.date,
      readingTime: content.readingTime,
      title: content.title,
      subtitle: content.subtitle,
    };
  });
}

export async function listPublishedFeedIssues(): Promise<PublishedFeedIssue[]> {
  const rows = await db
    .select({
      slug: newsletterIssues.slug,
      subject: newsletterIssues.subject,
      data: newsletterIssues.data,
      sentAt: newsletterIssues.sentAt,
    })
    .from(newsletterIssues)
    .where(
      and(
        eq(newsletterIssues.status, "sent"),
        sql`coalesce((${newsletterIssues.data}->>'archivePublished')::boolean, true) = true`,
      ),
    )
    .orderBy(desc(newsletterIssues.sentAt));

  return rows.map((row) => {
    const content = row.data.spanish ?? row.data;
    return {
      slug: row.slug,
      subject: content.subject || row.subject || content.issueLabel,
      preview: content.preview,
      subtitle: content.subtitle,
      sentAt: row.sentAt,
    };
  });
}

function formatArchiveSentDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return `${day} ${month} ${year}`.trim();
}

export async function getPublishedIssue(slug: string): Promise<PublishedIssue | null> {
  const [row] = await db
    .select({ slug: newsletterIssues.slug, data: newsletterIssues.data })
    .from(newsletterIssues)
    .where(
      and(
        eq(newsletterIssues.slug, slug),
        eq(newsletterIssues.status, "sent"),
        sql`coalesce((${newsletterIssues.data}->>'archivePublished')::boolean, true) = true`,
      ),
    )
    .limit(1);

  return row ?? null;
}
