import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { eq, inArray } from "drizzle-orm";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

// Minimal fake Resend: records calls and returns ids in payload order.
function fakeResend(opts: { fail?: boolean } = {}) {
  const calls: unknown[][] = [];
  return {
    calls,
    client: {
      batch: {
        send: async (payloads: unknown[]) => {
          calls.push(payloads);
          if (opts.fail) return { data: null, error: { message: "boom" } };
          return {
            data: { data: payloads.map((_, i) => ({ id: `re_${i}` })) },
            error: null,
          };
        },
      },
    },
  };
}

d("processSendBatch (integration)", () => {
  let db: typeof import("../../lib/db/client").db;
  let schema: typeof import("../../lib/db/schema");
  let sb: typeof import("../../lib/newsletter/send-batch");
  let emptyIssue: typeof import("../../lib/newsletter/issue").emptyIssue;
  let issueId: string;
  let contactIds: string[];

  beforeAll(async () => {
    db = (await import("../../lib/db/client")).db;
    schema = await import("../../lib/db/schema");
    sb = await import("../../lib/newsletter/send-batch");
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

  async function seed(n: number) {
    const slug = `t-${process.pid}-${Date.now()}`;
    const data = { ...emptyIssue(slug), subject: "Test subject" };
    const [issue] = await db
      .insert(schema.newsletterIssues)
      .values({ slug, subject: data.subject, status: "sending", data })
      .returning({ id: schema.newsletterIssues.id });
    issueId = issue.id;
    const inserted = await db
      .insert(schema.contacts)
      .values(
        Array.from({ length: n }, (_, i) => ({
          email: `sb-${process.pid}-${Date.now()}-${i}@example.com`,
        })),
      )
      .returning({ id: schema.contacts.id });
    contactIds = inserted.map((r) => r.id);
    await db.insert(schema.newsletterSends).values(
      contactIds.map((contactId) => ({ issueId, contactId, status: "pending" as const })),
    );
  }

  const deps = (resend: unknown) => ({
    db,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resend: resend as any,
    from: "hola@aibuilders.lat",
    replyTo: undefined,
  });

  it("marks all recipients sent, records resendId, and finalizes the issue", async () => {
    await seed(3);
    const r = fakeResend();
    await sb.processSendBatch(deps(r.client), { issueId, contactIds });

    const rows = await db
      .select()
      .from(schema.newsletterSends)
      .where(eq(schema.newsletterSends.issueId, issueId));
    expect(rows.every((x) => x.status === "sent")).toBe(true);
    expect(rows.every((x) => x.resendId?.startsWith("re_"))).toBe(true);

    const [issue] = await db
      .select()
      .from(schema.newsletterIssues)
      .where(eq(schema.newsletterIssues.id, issueId));
    expect(issue.status).toBe("sent");
    expect(issue.sentAt).not.toBeNull();
  });

  it("is idempotent: a second run does not re-call Resend", async () => {
    await seed(2);
    const r = fakeResend();
    await sb.processSendBatch(deps(r.client), { issueId, contactIds });
    await sb.processSendBatch(deps(r.client), { issueId, contactIds });
    expect(r.calls.length).toBe(1);
  });

  it("throws and leaves rows pending when Resend errors", async () => {
    await seed(2);
    const r = fakeResend({ fail: true });
    await expect(
      sb.processSendBatch(deps(r.client), { issueId, contactIds }),
    ).rejects.toThrow(/Resend/);
    const rows = await db
      .select()
      .from(schema.newsletterSends)
      .where(eq(schema.newsletterSends.issueId, issueId));
    expect(rows.every((x) => x.status === "pending")).toBe(true);
  });

  it("failBatch marks pending rows failed and finalizes", async () => {
    await seed(2);
    await sb.failBatch(db, { issueId, contactIds });
    const rows = await db
      .select()
      .from(schema.newsletterSends)
      .where(eq(schema.newsletterSends.issueId, issueId));
    expect(rows.every((x) => x.status === "failed")).toBe(true);
    const [issue] = await db
      .select()
      .from(schema.newsletterIssues)
      .where(eq(schema.newsletterIssues.id, issueId));
    expect(issue.status).toBe("sent");
  });
});
