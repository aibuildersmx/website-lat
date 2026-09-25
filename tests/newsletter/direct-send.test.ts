import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

const send = vi.hoisted(() => vi.fn());
vi.mock("@/lib/newsletter/resend", () => ({
  loadNewsletterConfig: () => ({ resend: { emails: { send } }, from: "AI Builders <n@aibuilders.lat>", replyTo: undefined }),
}));

d("sendStandaloneTo", () => {
  let db: typeof import("../../lib/db/client").db;
  let schema: typeof import("../../lib/db/schema");
  let store: typeof import("../../lib/newsletter/standalone-store");
  let direct: typeof import("../../lib/newsletter/direct-send");
  const issueIds: string[] = [];
  const contactIds: string[] = [];
  const tag = `${process.pid}-${Date.now()}`;
  const stranger = `stranger+${tag}@example.com`;
  const member = `member+${tag}@example.com`;
  const gone = `gone+${tag}@example.com`;
  let emailId = "";

  beforeAll(async () => {
    db = (await import("../../lib/db/client")).db;
    schema = await import("../../lib/db/schema");
    store = await import("../../lib/newsletter/standalone-store");
    direct = await import("../../lib/newsletter/direct-send");
    const rows = await db.insert(schema.contacts).values([
      { email: member },
      { email: gone, newsletterSubscribed: false },
    ]).returning({ id: schema.contacts.id });
    contactIds.push(...rows.map((row) => row.id));
    const draft = await store.insertStandaloneDraft({
      subject: "Hackathon",
      preview: "20 lugares",
      title: "Nos vemos el sábado",
      body: "Hola **builders**.",
    });
    emailId = draft.id;
    issueIds.push(draft.id);
  });

  afterAll(async () => {
    for (const id of issueIds) await db.delete(schema.newsletterIssues).where(eq(schema.newsletterIssues.id, id));
    for (const id of contactIds) await db.delete(schema.contacts).where(eq(schema.contacts.id, id));
  });

  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: "re_1" }, error: null });
  });

  it("sends to a non-contact with a warning, once", async () => {
    const result = await direct.sendStandaloneTo(emailId, ` ${stranger.toUpperCase()} `, null);
    expect(result).toMatchObject({ sent: true, to: stranger, isContact: false, resendId: "re_1" });
    expect(result.warnings[0]).toContain("not in the AI Builders contacts list");
    const [message] = send.mock.calls[0];
    expect(message).toMatchObject({ to: [stranger], subject: "Hackathon" });
    expect(message.subject).not.toContain("[TEST]");
    expect(message.html).toContain("/unsubscribe");
    expect(message.html).not.toContain("RESEND_UNSUBSCRIBE_URL");
    expect(message.headers).toBeUndefined();

    await expect(direct.sendStandaloneTo(emailId, stranger, null)).rejects.toMatchObject({ code: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("lets an edited draft be sent again to the same address", async () => {
    const to = `edit+${tag}@example.com`;
    const first = await direct.sendStandaloneTo(emailId, to, null);
    await expect(direct.sendStandaloneTo(emailId, to, null)).rejects.toMatchObject({ code: "already_sent" });
    await store.updateStandaloneDraft(emailId, null, {
      slug: "ignored",
      subject: "Hackathon (v2)",
      preview: "20 lugares",
      title: "Nos vemos el sábado",
      body: "Hola **builders**, ahora con más detalles.",
    });
    const second = await direct.sendStandaloneTo(emailId, to, null);
    expect(second.version).toBe(first.version + 1);
    expect(send.mock.calls[1][0].subject).toBe("Hackathon (v2)");
  });

  it("signs the unsubscribe link for contacts and adds one-click headers", async () => {
    const result = await direct.sendStandaloneTo(emailId, member, null);
    expect(result).toMatchObject({ isContact: true, warnings: [] });
    const [message] = send.mock.calls[0];
    expect(message.headers["List-Unsubscribe"]).toContain(contactIds[0]);
  });

  it("refuses unsubscribed contacts, The Build Log, and bad addresses", async () => {
    await expect(direct.sendStandaloneTo(emailId, gone, null)).rejects.toMatchObject({ code: "unsubscribed" });
    await expect(direct.sendStandaloneTo(emailId, "a@b.co, c@d.co", null)).rejects.toMatchObject({ code: "invalid_recipient" });

    const [buildLog] = await db.insert(schema.newsletterIssues).values({
      slug: `t-${tag}`,
      subject: "Build Log",
      status: "draft",
      data: {} as never,
    }).returning({ id: schema.newsletterIssues.id });
    issueIds.push(buildLog.id);
    await expect(direct.sendStandaloneTo(buildLog.id, `other+${tag}@example.com`, null)).rejects.toMatchObject({ code: "wrong_kind" });
    expect(send).not.toHaveBeenCalled();
  });

  it("releases the claim when Resend fails so a retry can go out", async () => {
    const to = `retry+${tag}@example.com`;
    send.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(direct.sendStandaloneTo(emailId, to, null)).rejects.toMatchObject({ code: "send_failed" });
    await expect(direct.sendStandaloneTo(emailId, to, null)).resolves.toMatchObject({ sent: true });
  });

  it("refuses empty drafts", async () => {
    const empty = await store.insertStandaloneDraft();
    issueIds.push(empty.id);
    await expect(direct.sendStandaloneTo(empty.id, `e+${tag}@example.com`, null)).rejects.toMatchObject({ code: "invalid_email" });
  });
});
