import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyIssue } from "@/lib/newsletter/issue";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

d("standalone email persistence", () => {
  let db: typeof import("../../lib/db/client").db;
  let schema: typeof import("../../lib/db/schema");
  let store: typeof import("../../lib/newsletter/standalone-store");
  let newsletters: typeof import("../../lib/mcp/newsletters");
  let draftCreate: typeof import("../../lib/newsletter/draft-create");
  let archive: typeof import("../../lib/newsletter/archive");
  const ids: string[] = [];

  beforeAll(async () => {
    db = (await import("../../lib/db/client")).db;
    schema = await import("../../lib/db/schema");
    store = await import("../../lib/newsletter/standalone-store");
    newsletters = await import("../../lib/mcp/newsletters");
    draftCreate = await import("../../lib/newsletter/draft-create");
    archive = await import("../../lib/newsletter/archive");
  });

  afterAll(async () => {
    for (const id of ids) {
      await db.delete(schema.newsletterIssues).where(eq(schema.newsletterIssues.id, id));
    }
  });

  it("creates a standalone draft with a non-numeric slug", async () => {
    const row = await store.insertStandaloneDraft({ subject: "Hola" });
    ids.push(row.id);
    expect(row.slug).toMatch(/^s-[a-z0-9]{8}$/);
    expect(row.email).toMatchObject({ subject: "Hola", slug: row.slug });
    const [saved] = await db.select().from(schema.newsletterIssues).where(eq(schema.newsletterIssues.id, row.id));
    expect(saved.kind).toBe("standalone");
  });

  it("updates at the expected version and keeps the slug immutable", async () => {
    const row = await store.insertStandaloneDraft();
    ids.push(row.id);
    const updated = await store.updateStandaloneDraft(row.id, 1, { ...row.email, slug: "s-hijacked", subject: "Nuevo" });
    expect(updated).toMatchObject({ version: 2, subject: "Nuevo", slug: row.slug });
    expect(updated.email.slug).toBe(row.slug);
  });

  it("rejects stale versions and Build Log ids", async () => {
    const row = await store.insertStandaloneDraft();
    ids.push(row.id);
    await expect(store.updateStandaloneDraft(row.id, 99, row.email)).rejects.toBeInstanceOf(store.StandaloneConflictError);
    const buildLog = await draftCreate.insertNewsletterDraft();
    ids.push(buildLog.id);
    await expect(store.updateStandaloneDraft(buildLog.id, null, row.email)).rejects.toBeInstanceOf(store.WrongEmailKindError);
  });

  it("Build Log MCP writes refuse a standalone id", async () => {
    const row = await store.insertStandaloneDraft();
    ids.push(row.id);
    await expect(newsletters.updateNewsletterDraft(row.id, 1, emptyIssue("999")))
      .rejects.toMatchObject({ code: "wrong_kind", actual: "standalone" });
    await expect(newsletters.setNewsletterAdPlacement(row.id, 1, "top"))
      .rejects.toMatchObject({ code: "wrong_kind", actual: "standalone" });
  });

  it("MCP reads expose kind and the standalone payload", async () => {
    const row = await store.insertStandaloneDraft({ subject: "Leer" });
    ids.push(row.id);
    const draft = await newsletters.getNewsletterDraft(row.id);
    expect(draft).toMatchObject({ kind: "standalone", email: { subject: "Leer" } });
    const standaloneOnly = await newsletters.listNewsletterDrafts(50, "standalone");
    expect(standaloneOnly.map((item) => item.id)).toContain(row.id);
    expect(standaloneOnly.every((item) => item.kind === "standalone")).toBe(true);
    const buildLogOnly = await newsletters.listNewsletterDrafts(50, "build_log");
    expect(buildLogOnly.map((item) => item.id)).not.toContain(row.id);
  });

  it("keeps sent standalone emails out of the public archive and feed", async () => {
    const row = await store.insertStandaloneDraft({ subject: "Solo lista" });
    ids.push(row.id);
    await db
      .update(schema.newsletterIssues)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(schema.newsletterIssues.id, row.id));
    expect((await archive.listPublishedIssues()).map((issue) => issue.slug)).not.toContain(row.slug);
    expect((await archive.listPublishedFeedIssues()).map((issue) => issue.slug)).not.toContain(row.slug);
    expect(await archive.getPublishedIssue(row.slug)).toBeNull();
  });
});
