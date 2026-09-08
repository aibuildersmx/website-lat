"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { db } from "@/lib/db/client";
import { getUserByEmail, type AuthUser } from "@/lib/auth/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import {
  discardPasswordResetToken,
  isResetToken,
  issuePasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset";
import { passwordResetEmail, passwordResetUrl } from "@/lib/auth/reset-email";
import { loadNewsletterConfig } from "@/lib/newsletter/resend";
import { rateLimit } from "@/lib/rate-limit";

// A fixed valid bcrypt hash (cost 12) used only to equalize timing on the
// unknown-email path, so an attacker can't distinguish "no such user" from
// "wrong password" by response latency. Not a credential — never matches.
const DUMMY_PASSWORD_HASH = "$2b$12$rwG7NZ4upmqXwWCF3oo8oO610QWilpmM1JNaQ.TJbtxKEVEig5ldC";
const RESET_REQUEST_MESSAGE =
  "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.";

async function requestClientKey(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
}

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

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok: true; message: string }> {
  const email = ((formData.get("email") as string | null) ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 320);
  const clientKey = await requestClientKey();
  const allowed = rateLimit(`password-reset:ip:${clientKey}`, 5, 15 * 60 * 1000);

  if (email.includes("@") && allowed) {
    // Keep the public response uniform for known and unknown addresses. Email
    // lookup and delivery happen after the response so timing does not reveal
    // whether an administrator account exists.
    after(async () => {
      const user = await getUserByEmail(db, email);
      if (!user || !rateLimit(`password-reset:email:${email}`, 2, 60 * 60 * 1000)) return;

      let token: string | null = null;
      try {
        const cfg = loadNewsletterConfig();
        token = await issuePasswordResetToken(db, user.id);
        const emailContent = passwordResetEmail(passwordResetUrl(token));
        const result = await cfg.resend.emails.send({
          from: cfg.from,
          to: [user.email],
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
          replyTo: cfg.replyTo,
        });
        if (result.error) throw new Error(result.error.message);
      } catch (error) {
        if (token) await discardPasswordResetToken(db, token).catch(() => undefined);
        console.error("Password reset email failed:", error);
      }
    });
  }

  return { ok: true, message: RESET_REQUEST_MESSAGE };
}

export async function resetPassword(
  formData: FormData,
): Promise<{ error: string } | { ok: true; message: string }> {
  const token = ((formData.get("token") as string | null) ?? "").trim();
  const password = (formData.get("password") as string | null) ?? "";
  const confirmation = (formData.get("password_confirmation") as string | null) ?? "";

  if (!isResetToken(token)) {
    return { error: "Este enlace no es válido o ya venció. Solicita uno nuevo." };
  }
  const clientKey = await requestClientKey();
  if (!rateLimit(`password-reset:submit:${clientKey}`, 10, 15 * 60 * 1000)) {
    return { error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." };
  }
  if (password.length < 10) {
    return { error: "La contraseña debe tener al menos 10 caracteres." };
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { error: "La contraseña es demasiado larga." };
  }
  if (password !== confirmation) {
    return { error: "Las contraseñas no coinciden." };
  }

  const changed = await resetPasswordWithToken(db, token, password);
  if (!changed) {
    return { error: "Este enlace no es válido o ya venció. Solicita uno nuevo." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Contraseña actualizada. Ya puedes iniciar sesión." };
}
