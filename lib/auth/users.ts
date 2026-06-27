import { eq } from "drizzle-orm";
import type { DB } from "../db/client";
import { users } from "../db/schema";
import { hashPassword } from "./password";

/** The shape every auth consumer relies on (`user.email`). */
export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export async function getUserByEmail(db: DB, email: string) {
  const normalized = email.trim().toLowerCase();
  const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return rows[0] ?? null;
}

/** Creates a user with a hashed password. Email is lowercased. */
export async function createUser(
  db: DB,
  email: string,
  password: string,
  role = "admin",
): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({ email: normalized, passwordHash, role })
    .returning({ id: users.id, email: users.email, role: users.role });
  return row;
}
