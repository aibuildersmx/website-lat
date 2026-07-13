import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { emptyIssue } from "@/lib/newsletter/issue";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

d("MCP database boundaries", () => {
  let db: typeof import("../../lib/db/client").db;
  let schema: typeof import("../../lib/db/schema");
  let newsletters: typeof import("../../lib/mcp/newsletters");
  let draftCreate: typeof import("../../lib/newsletter/draft-create");
  let auth: typeof import("../../lib/mcp/auth");
  let tokens: typeof import("../../lib/mcp/tokens");
  let audit: typeof import("../../lib/mcp/audit");
  let userId = "";
  const issueIds: string[] = [];

  beforeAll(async () => {
    db = (await import("../../lib/db/client")).db;
    schema = await import("../../lib/db/schema");
    newsletters = await import("../../lib/mcp/newsletters");
    draftCreate = await import("../../lib/newsletter/draft-create");
    auth = await import("../../lib/mcp/auth");
    tokens = await import("../../lib/mcp/tokens");
    audit = await import("../../lib/mcp/audit");
    const [user] = await db.insert(schema.users).values({
      email: `mcp-test+${process.pid}@example.com`,
      passwordHash: "not-used",
      role: "admin",
    }).returning({ id: schema.users.id });
    userId = user.id;
  });

  afterAll(async () => {
    for (const issueId of issueIds) {
      await db.delete(schema.newsletterIssues).where(eq(schema.newsletterIssues.id, issueId));
    }
    if (userId) await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("persists only the credential hash and honors revocation", async () => {
    const generated = tokens.generateMcpToken();
    const [row] = await db.insert(schema.mcpApiTokens).values({
      userId,
      name: "test",
      tokenHash: generated.hash,
      tokenPrefix: generated.displayPrefix,
      scopes: [...auth.DEFAULT_MCP_SCOPES],
      expiresAt: new Date(Date.now() + 60_000),
    }).returning();
    expect(row.tokenHash).not.toBe(generated.raw);
    expect(await auth.authenticateMcpToken(generated.raw)).toMatchObject({ userId, tokenId: row.id });
    await db.update(schema.mcpApiTokens).set({ revokedAt: new Date() }).where(eq(schema.mcpApiTokens.id, row.id));
    expect(await auth.authenticateMcpToken(generated.raw)).toBeNull();
  });

  it("atomically rejects stale revisions and non-draft updates", async () => {
    const created = await newsletters.createNewsletterDraft(emptyIssue("ignored"), "MCP test");
    const issueId = created.id;
    issueIds.push(issueId);
    expect(created.version).toBe(1);

    const updatedIssue = { ...created.issue, subtitle: "Updated by MCP" };
    const updated = await newsletters.updateNewsletterDraft(issueId, 1, updatedIssue);
    expect(updated.version).toBe(2);
    await expect(newsletters.updateNewsletterDraft(issueId, 1, updatedIssue))
      .rejects.toBeInstanceOf(newsletters.DraftConflictError);

    await db.update(schema.newsletterIssues).set({ status: "sending" }).where(eq(schema.newsletterIssues.id, issueId));
    await expect(newsletters.updateNewsletterDraft(issueId, 2, updatedIssue))
      .rejects.toBeInstanceOf(newsletters.DraftConflictError);
    expect(await newsletters.getNewsletterDraft(issueId)).toBeNull();
    expect((await newsletters.listNewsletterDrafts(50)).some((draft) => draft.id === issueId)).toBe(false);

    const [stored] = await db.select({ data: schema.newsletterIssues.data }).from(schema.newsletterIssues)
      .where(and(eq(schema.newsletterIssues.id, issueId), eq(schema.newsletterIssues.status, "sending")));
    expect(stored.data.subtitle).toBe("Updated by MCP");
  });

  it("serializes simultaneous issue-number allocation", async () => {
    const [first, second] = await Promise.all([
      newsletters.createNewsletterDraft(undefined, "Concurrent A"),
      newsletters.createNewsletterDraft(undefined, "Concurrent B"),
    ]);
    issueIds.push(first.id, second.id);
    expect(first.slug).not.toBe(second.slug);
  });

  it("preserves an unused issue number explicitly chosen in the human composer", async () => {
    const requested = `manual-${process.pid}`;
    const created = await draftCreate.insertNewsletterDraft(
      emptyIssue(requested),
      undefined,
      { respectRequestedSlug: true },
    );
    issueIds.push(created.id);
    expect(created.slug).toBe(requested);
  });

  it("atomically admits only the configured number of concurrent requests", async () => {
    const key = `test:${process.pid}:${Date.now()}`;
    const claims = await Promise.all(
      Array.from({ length: 10 }, () => audit.claimMcpRateLimit(key, 3)),
    );
    expect(claims.filter(Boolean)).toHaveLength(3);
    await db.delete(schema.mcpRateLimits).where(eq(schema.mcpRateLimits.key, key));
  });
});
