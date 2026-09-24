// Persistence for kind = "standalone" rows. Every read/write filters on kind,
// so Build Log tooling can never overwrite a standalone email and vice versa.
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterIssues } from "@/lib/db/schema";
import type { EmailDraft } from "./render-email";
import { emptyStandalone, standaloneSlug, type EmailKind, type StandaloneEmail } from "./standalone-types";
import type { Issue } from "./types";

export class StandaloneConflictError extends Error {
  readonly code = "draft_conflict";
}

// The id exists but belongs to the other kind of email. Agents get told which
// tool to use instead of a generic "re-read and retry".
export class WrongEmailKindError extends Error {
  readonly code = "wrong_kind";
  constructor(readonly actual: EmailKind) {
    super(`This draft is a ${actual} email.`);
  }
}

export async function assertDraftKind(id: string, expected: EmailKind): Promise<void> {
  const [row] = await db
    .select({ kind: newsletterIssues.kind })
    .from(newsletterIssues)
    .where(and(eq(newsletterIssues.id, id), eq(newsletterIssues.status, "draft")))
    .limit(1);
  if (row && row.kind !== expected) throw new WrongEmailKindError(row.kind);
}

export interface StandaloneRow {
  id: string;
  slug: string;
  subject: string;
  version: number;
  email: StandaloneEmail;
  updatedAt: string;
}

const returning = {
  id: newsletterIssues.id,
  slug: newsletterIssues.slug,
  subject: newsletterIssues.subject,
  version: newsletterIssues.version,
  data: newsletterIssues.data,
  updatedAt: newsletterIssues.updatedAt,
};

function toRow(row: { id: string; slug: string; subject: string; version: number; data: unknown; updatedAt: Date }): StandaloneRow {
  return {
    id: row.id,
    slug: row.slug,
    subject: row.subject,
    version: row.version,
    email: row.data as StandaloneEmail,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// data is typed as Issue at the column level; kind decides the real shape.
export function rowToDraft(row: { kind: EmailKind; data: unknown }): EmailDraft {
  return row.kind === "standalone"
    ? { kind: "standalone", data: row.data as StandaloneEmail }
    : { kind: "build_log", data: row.data as Issue };
}

export async function insertStandaloneDraft(input: Partial<StandaloneEmail> = {}): Promise<StandaloneRow> {
  const slug = standaloneSlug();
  const email: StandaloneEmail = { ...emptyStandalone(slug), ...input, slug };
  const [row] = await db
    .insert(newsletterIssues)
    .values({
      kind: "standalone",
      slug,
      subject: email.subject,
      status: "draft",
      data: email as unknown as Issue,
      version: 1,
    })
    .returning(returning);
  return toRow(row);
}

// expectedVersion = null skips the revision check (the admin autosave owns the
// row); MCP callers always pass the revision they read.
export async function updateStandaloneDraft(
  id: string,
  expectedVersion: number | null,
  input: StandaloneEmail,
): Promise<StandaloneRow> {
  const where = and(
    eq(newsletterIssues.id, id),
    eq(newsletterIssues.kind, "standalone"),
    eq(newsletterIssues.status, "draft"),
    ...(expectedVersion === null ? [] : [eq(newsletterIssues.version, expectedVersion)]),
  );
  const [current] = await db.select({ slug: newsletterIssues.slug }).from(newsletterIssues).where(where).limit(1);
  if (!current) {
    await assertDraftKind(id, "standalone");
    throw new StandaloneConflictError("Draft not found or revision is stale.");
  }

  const email: StandaloneEmail = { ...input, slug: current.slug }; // slug is immutable
  const [updated] = await db
    .update(newsletterIssues)
    .set({
      subject: email.subject,
      data: email as unknown as Issue,
      version: sql`${newsletterIssues.version} + 1`,
      updatedAt: new Date(),
    })
    .where(where)
    .returning(returning);
  if (!updated) throw new StandaloneConflictError("Draft changed while it was being updated.");
  return toRow(updated);
}
