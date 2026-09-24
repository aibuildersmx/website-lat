import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterIssues } from "@/lib/db/schema";
import { syncAdPlacement } from "@/lib/newsletter/ad-placement";
import { insertNewsletterDraft } from "@/lib/newsletter/draft-create";
import { rowToDraft } from "@/lib/newsletter/standalone-store";
import type { EmailKind } from "@/lib/newsletter/standalone-types";
import type { AdPlacement, Issue } from "@/lib/newsletter/types";

export class DraftConflictError extends Error {
  readonly code = "draft_conflict";
}

export async function listNewsletterDrafts(limit: number, kind?: EmailKind) {
  const rows = await db
    .select({
      id: newsletterIssues.id,
      kind: newsletterIssues.kind,
      slug: newsletterIssues.slug,
      subject: newsletterIssues.subject,
      version: newsletterIssues.version,
      updatedAt: newsletterIssues.updatedAt,
    })
    .from(newsletterIssues)
    .where(
      and(
        eq(newsletterIssues.status, "draft"),
        ...(kind ? [eq(newsletterIssues.kind, kind)] : []),
      ),
    )
    .orderBy(desc(newsletterIssues.updatedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }));
}

// Build Log drafts come back as `issue`, standalone emails as `email`, so an
// agent can't mistake one shape for the other.
export async function getNewsletterDraft(id: string) {
  const [row] = await db
    .select({
      id: newsletterIssues.id,
      kind: newsletterIssues.kind,
      slug: newsletterIssues.slug,
      subject: newsletterIssues.subject,
      version: newsletterIssues.version,
      data: newsletterIssues.data,
      updatedAt: newsletterIssues.updatedAt,
    })
    .from(newsletterIssues)
    .where(and(eq(newsletterIssues.id, id), eq(newsletterIssues.status, "draft")))
    .limit(1);
  if (!row) return null;
  const { data, ...meta } = row;
  const draft = rowToDraft(row);
  const content = draft.kind === "standalone" ? { email: draft.data } : { issue: data };
  return { ...meta, ...content, updatedAt: row.updatedAt.toISOString() };
}

export async function createNewsletterDraft(issueInput?: Issue, subject?: string) {
  const row = await insertNewsletterDraft(issueInput ? syncAdPlacement(issueInput) : undefined, subject);
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

export async function updateNewsletterDraft(
  id: string,
  expectedVersion: number,
  issueInput: Issue,
) {
  const [current] = await db
    .select({ slug: newsletterIssues.slug })
    .from(newsletterIssues)
    .where(
      and(
        eq(newsletterIssues.id, id),
        eq(newsletterIssues.kind, "build_log"),
        eq(newsletterIssues.status, "draft"),
        eq(newsletterIssues.version, expectedVersion),
      ),
    )
    .limit(1);
  if (!current) throw new DraftConflictError("Draft not found or revision is stale.");

  // The public issue identifier is immutable through MCP. Status, send IDs,
  // archive controls, and other row-level fields are never accepted as input.
  const issue = syncAdPlacement({ ...issueInput, slug: current.slug });
  const [updated] = await db
    .update(newsletterIssues)
    .set({
      subject: issue.subject,
      data: issue,
      version: sql`${newsletterIssues.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(newsletterIssues.id, id),
        eq(newsletterIssues.kind, "build_log"),
        eq(newsletterIssues.status, "draft"),
        eq(newsletterIssues.version, expectedVersion),
      ),
    )
    .returning({
      id: newsletterIssues.id,
      slug: newsletterIssues.slug,
      subject: newsletterIssues.subject,
      version: newsletterIssues.version,
      issue: newsletterIssues.data,
      updatedAt: newsletterIssues.updatedAt,
    });

  if (!updated) throw new DraftConflictError("Draft changed while it was being updated.");
  return { ...updated, updatedAt: updated.updatedAt.toISOString() };
}

export async function setNewsletterAdPlacement(
  id: string,
  expectedVersion: number,
  placement: AdPlacement,
) {
  const [current] = await db
    .select({ data: newsletterIssues.data })
    .from(newsletterIssues)
    .where(
      and(
        eq(newsletterIssues.id, id),
        eq(newsletterIssues.kind, "build_log"),
        eq(newsletterIssues.status, "draft"),
        eq(newsletterIssues.version, expectedVersion),
      ),
    )
    .limit(1);
  if (!current) throw new DraftConflictError("Draft not found or revision is stale.");

  const issue = syncAdPlacement({ ...current.data, adPlacement: placement });
  const [updated] = await db
    .update(newsletterIssues)
    .set({
      data: issue,
      version: sql`${newsletterIssues.version} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(newsletterIssues.id, id),
        eq(newsletterIssues.kind, "build_log"),
        eq(newsletterIssues.status, "draft"),
        eq(newsletterIssues.version, expectedVersion),
      ),
    )
    .returning({
      id: newsletterIssues.id,
      slug: newsletterIssues.slug,
      subject: newsletterIssues.subject,
      version: newsletterIssues.version,
      issue: newsletterIssues.data,
      updatedAt: newsletterIssues.updatedAt,
    });

  if (!updated) throw new DraftConflictError("Draft changed while it was being updated.");
  return { ...updated, updatedAt: updated.updatedAt.toISOString() };
}
