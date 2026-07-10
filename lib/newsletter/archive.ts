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
  return rows.map((r) => ({
    slug: r.slug,
    issueLabel: r.data.issueLabel,
    date: r.sentAt ? formatArchiveSentDate(r.sentAt) : r.data.date,
    readingTime: r.data.readingTime,
    title: r.data.title,
    subtitle: r.data.subtitle,
  }));
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

  return rows.map((row) => ({
    slug: row.slug,
    subject: row.subject || row.data.issueLabel,
    preview: row.data.preview,
    subtitle: row.data.subtitle,
    sentAt: row.sentAt,
  }));
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
