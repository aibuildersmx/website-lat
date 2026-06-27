import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

d("newsletter_sends idempotency (integration)", () => {
  let db: typeof import("../../lib/db/client").db;
  let schema: typeof import("../../lib/db/schema");
  let emptyIssue: typeof import("../../lib/newsletter/issue").emptyIssue;
  let issueId: string;
  let contactIds: string[];

  beforeAll(async () => {
    db = (await import("../../lib/db/client")).db;
    schema = await import("../../lib/db/schema");
    ({ emptyIssue } = await import("../../lib/newsletter/issue"));
  });

  afterEach(async () => {
    if (issueId) {
      await db.delete(schema.newsletterSends).where(eq(schema.newsletterSends.issueId, issueId));
      await db.delete(schema.newsletterIssues).where(eq(schema.newsletterIssues.id, issueId));
    }
    if (contactIds?.length) {
      await db.delete(schema.contacts).where(inArray(schema.contacts.id, contactIds));
    }
  });

  it("inserting the same (issueId, contactId) twice yields one row", async () => {
    const slug = `idem-${process.pid}-${Date.now()}`;
    const [issue] = await db
      .insert(schema.newsletterIssues)
      .values({ slug, subject: "x", status: "sending", data: emptyIssue(slug) })
      .returning({ id: schema.newsletterIssues.id });
    issueId = issue.id;
    const [c] = await db
      .insert(schema.contacts)
      .values({ email: `idem-${process.pid}-${Date.now()}@example.com` })
      .returning({ id: schema.contacts.id });
    contactIds = [c.id];

    const rows = [{ issueId, contactId: c.id, status: "pending" as const }];
    await db.insert(schema.newsletterSends).values(rows).onConflictDoNothing({
      target: [schema.newsletterSends.issueId, schema.newsletterSends.contactId],
    });
    await db.insert(schema.newsletterSends).values(rows).onConflictDoNothing({
      target: [schema.newsletterSends.issueId, schema.newsletterSends.contactId],
    });

    const stored = await db
      .select()
      .from(schema.newsletterSends)
      .where(eq(schema.newsletterSends.issueId, issueId));
    expect(stored.length).toBe(1);
  });
});
