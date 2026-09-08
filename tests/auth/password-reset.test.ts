import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

const HAS_DB = !!process.env.DATABASE_URL?.trim();
const d = HAS_DB ? describe : describe.skip;

d("password reset DB round-trip", () => {
  let db: typeof import("../../lib/db/client").db;
  let schema: typeof import("../../lib/db/schema");
  let passwords: typeof import("../../lib/auth/password");
  let reset: typeof import("../../lib/auth/password-reset");
  let session: typeof import("../../lib/auth/session");
  let users: typeof import("../../lib/auth/users");
  let userId: string;
  const email = `password-reset-test+${process.pid}@example.com`;

  beforeAll(async () => {
    db = (await import("../../lib/db/client")).db;
    schema = await import("../../lib/db/schema");
    passwords = await import("../../lib/auth/password");
    reset = await import("../../lib/auth/password-reset");
    session = await import("../../lib/auth/session");
    users = await import("../../lib/auth/users");
    const user = await users.createUser(db, email, "original-password");
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("replaces older reset links for the same user", async () => {
    const oldToken = await reset.issuePasswordResetToken(db, userId);
    const newToken = await reset.issuePasswordResetToken(db, userId);

    expect(await reset.resetPasswordWithToken(db, oldToken, "should-not-work")).toBe(false);
    expect(await reset.resetPasswordWithToken(db, newToken, "replacement-password")).toBe(true);
  });

  it("updates the password, invalidates sessions, and cannot be reused", async () => {
    const activeSession = await session.createSessionForUser(db, userId);
    const token = await reset.issuePasswordResetToken(db, userId);

    expect(await reset.resetPasswordWithToken(db, token, "new-secure-password")).toBe(true);
    expect(await session.resolveSessionUser(db, activeSession)).toBeNull();

    const user = await users.getUserByEmail(db, email);
    expect(user).not.toBeNull();
    expect(await passwords.verifyPassword("new-secure-password", user!.passwordHash)).toBe(true);
    expect(await reset.resetPasswordWithToken(db, token, "another-password")).toBe(false);
  });

  it("rejects expired reset links", async () => {
    const issuedTwoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const token = await reset.issuePasswordResetToken(db, userId, issuedTwoHoursAgo);

    expect(await reset.resetPasswordWithToken(db, token, "another-password")).toBe(false);
  });
});

describe("password reset token validation", () => {
  it("accepts only 64-character lowercase hex tokens", async () => {
    const { isResetToken } = await import("../../lib/auth/password-reset");
    expect(isResetToken("a".repeat(64))).toBe(true);
    expect(isResetToken("A".repeat(64))).toBe(false);
    expect(isResetToken("a".repeat(63))).toBe(false);
    expect(isResetToken("not-a-token")).toBe(false);
  });
});
