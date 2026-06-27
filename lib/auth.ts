"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { getUserByEmail, type AuthUser } from "@/lib/auth/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";

// A fixed valid bcrypt hash (cost 12) used only to equalize timing on the
// unknown-email path, so an attacker can't distinguish "no such user" from
// "wrong password" by response latency. Not a credential — never matches.
const DUMMY_PASSWORD_HASH = "$2b$12$rwG7NZ4upmqXwWCF3oo8oO610QWilpmM1JNaQ.TJbtxKEVEig5ldC";

export async function signIn(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios." };
  }

  const user = await getUserByEmail(db, email);
  // Always run a bcrypt compare (against the dummy hash when the user is
  // missing) so both branches take the same time.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordOk) {
    return { error: "Credenciales incorrectas. Intenta de nuevo." };
  }

  await createSession(db, user.id);
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signOut() {
  await destroySession(db);
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getUser(): Promise<AuthUser | null> {
  return getSessionUser(db);
}
