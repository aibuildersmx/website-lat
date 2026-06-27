import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import type { DB } from "../db/client";
import { sessions, users } from "../db/schema";
import type { AuthUser } from "./users";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "aibm_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Inserts a session row; returns the RAW token (cookie value). */
export async function createSessionForUser(
  db: DB,
  userId: string,
  expiresAt: Date = new Date(Date.now() + THIRTY_DAYS_MS),
): Promise<string> {
  const token = generateToken();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return token;
}

/** Resolves an unexpired session's user from a raw token, or null. */
export async function resolveSessionUser(db: DB, token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

/** Deletes a session row by its raw token. */
export async function deleteSession(db: DB, token: string): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

// ---- Cookie-aware wrappers (used by server actions) ----

export async function createSession(db: DB, userId: string): Promise<void> {
  const token = await createSessionForUser(db, userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_MS / 1000,
  });
}

export async function getSessionUser(db: DB): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? "";
  return resolveSessionUser(db, token);
}

export async function destroySession(db: DB): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value ?? "";
  await deleteSession(db, token);
  jar.delete(SESSION_COOKIE);
}
