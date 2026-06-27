import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

d("session DB round-trip", () => {
  let db: typeof import("../../lib/db/client").db;
  let schema: typeof import("../../lib/db/schema");
  let session: typeof import("../../lib/auth/session");
  let users: typeof import("../../lib/auth/users");
  let userId: string;
  const email = `session-test+${process.pid}@example.com`;

  beforeAll(async () => {
    db = (await import("../../lib/db/client")).db;
    schema = await import("../../lib/db/schema");
    session = await import("../../lib/auth/session");
    users = await import("../../lib/auth/users");
    const u = await users.createUser(db, email, "pw-123456");
    userId = u.id;
  });

  afterAll(async () => {
    if (userId) await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("creates a session and resolves the user from the raw token", async () => {
    const token = await session.createSessionForUser(db, userId);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const resolved = await session.resolveSessionUser(db, token);
    expect(resolved?.email).toBe(email);
    expect(resolved?.id).toBe(userId);
  });

  it("returns null for an unknown token", async () => {
    expect(await session.resolveSessionUser(db, "deadbeef")).toBeNull();
  });

  it("deletes a session so it no longer resolves", async () => {
    const token = await session.createSessionForUser(db, userId);
    await session.deleteSession(db, token);
    expect(await session.resolveSessionUser(db, token)).toBeNull();
  });

  it("does not resolve an expired session", async () => {
    const past = new Date(Date.now() - 1000);
    const token = await session.createSessionForUser(db, userId, past);
    expect(await session.resolveSessionUser(db, token)).toBeNull();
  });
});
