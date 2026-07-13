import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterIssues } from "@/lib/db/schema";
import { emptyIssue } from "./issue";
import type { Issue } from "./types";

function nextSlug(existing: string[]): string {
  const max = existing.reduce((current, slug) => {
    const number = Number.parseInt(slug, 10);
    return Number.isFinite(number) && number > current ? number : current;
  }, 0);
  return String(max + 1).padStart(3, "0");
}

// All interactive creation paths share one transaction-scoped lock so two
// agents (or an agent and the composer) cannot allocate the same issue number.
export async function insertNewsletterDraft(
  issueInput?: Issue,
  subject?: string,
  options: { respectRequestedSlug?: boolean } = {},
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('newsletter_issue_slug'))`);
    const slugs = await tx.select({ slug: newsletterIssues.slug }).from(newsletterIssues);
    const existingSlugs = slugs.map((row) => row.slug);
    const requestedSlug = issueInput?.slug.trim();
    const slug = options.respectRequestedSlug && requestedSlug && !existingSlugs.includes(requestedSlug)
      ? requestedSlug
      : nextSlug(existingSlugs);
    const base = issueInput ?? emptyIssue(slug);
    const issue: Issue = {
      ...base,
      slug,
      issueLabel: options.respectRequestedSlug || base.showIssueLabel === false
        ? base.issueLabel
        : `Issue ${slug}`,
      subject: subject ?? base.subject,
    };
    const [row] = await tx
      .insert(newsletterIssues)
      .values({ slug, subject: issue.subject, status: "draft", data: issue, version: 1 })
      .returning({
        id: newsletterIssues.id,
        slug: newsletterIssues.slug,
        subject: newsletterIssues.subject,
        version: newsletterIssues.version,
        issue: newsletterIssues.data,
        updatedAt: newsletterIssues.updatedAt,
      });
    return row;
  });
}
