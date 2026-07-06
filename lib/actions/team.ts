"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { sessions, users } from "@/lib/db/schema";

const TEAM_PATH = "/admin/team";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

function destination(status: string): string {
  return `${TEAM_PATH}?status=${encodeURIComponent(status)}`;
}

async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

function readEmail(formData: FormData): string {
  return ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
}

function readPassword(formData: FormData): string {
  return (formData.get("password") as string | null) ?? "";
}

function validPassword(password: string): boolean {
  return password.length >= 10;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  await requireAdmin();
  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function inviteTeamMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = readEmail(formData);
  const password = readPassword(formData);

  if (!EMAIL_RE.test(email)) redirect(destination("invalid-email"));
  if (!validPassword(password)) redirect(destination("weak-password"));

  const passwordHash = await hashPassword(password);
  await db
    .insert(users)
    .values({ email, passwordHash, role: "admin" })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        role: "admin",
        updatedAt: new Date(),
      },
    });

  revalidatePath(TEAM_PATH);
  redirect(destination("saved"));
}

export async function resetTeamMemberPassword(
  userId: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const password = readPassword(formData);
  if (!validPassword(password)) redirect(destination("weak-password"));

  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Force all existing sessions for that user to log in with the new password.
  await db.delete(sessions).where(eq(sessions.userId, userId));

  revalidatePath(TEAM_PATH);
  redirect(destination("password-reset"));
}

export async function removeTeamMember(userId: string): Promise<void> {
  const currentUser = await requireAdmin();
  if (userId === currentUser.id) redirect(destination("cannot-remove-self"));

  const [{ remaining }] = await db
    .select({ remaining: sql<number>`count(*)::int` })
    .from(users)
    .where(ne(users.id, userId));
  if (remaining === 0) redirect(destination("last-admin"));

  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db
    .delete(users)
    .where(and(eq(users.id, userId), ne(users.id, currentUser.id)));

  revalidatePath(TEAM_PATH);
  redirect(destination("removed"));
}
