import { and, eq, gt } from "drizzle-orm";
import type { DB } from "@/lib/db/client";
import { passwordResetTokens, sessions, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function issuePasswordResetToken(
  db: DB,
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const token = generateToken();

  await db.transaction(async (tx) => {
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.insert(passwordResetTokens).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
    });
  });

  return token;
}

export async function discardPasswordResetToken(db: DB, token: string): Promise<void> {
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashToken(token)));
}

export async function resetPasswordWithToken(
  db: DB,
  token: string,
  password: string,
  now: Date = new Date(),
): Promise<boolean> {
  const passwordHash = await hashPassword(password);

  return db.transaction(async (tx) => {
    const [reset] = await tx
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(token)),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });

    if (!reset) return false;

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: now })
      .where(eq(users.id, reset.userId));
    await tx.delete(sessions).where(eq(sessions.userId, reset.userId));
    await tx
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, reset.userId));

    return true;
  });
}

export function isResetToken(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
