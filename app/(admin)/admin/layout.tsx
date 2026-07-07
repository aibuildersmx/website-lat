import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser, signOut } from "@/lib/auth";
import {
  ADMIN_LANGUAGE_COOKIE,
  normalizeAdminLanguage,
} from "@/lib/admin/language";
import { AdminShell } from "./components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, cookieStore] = await Promise.all([getUser(), cookies()]);
  if (!user) {
    redirect("/login");
  }
  const language = normalizeAdminLanguage(cookieStore.get(ADMIN_LANGUAGE_COOKIE)?.value);

  return (
    <AdminShell email={user.email} language={language} signOutAction={signOut}>
      {children}
    </AdminShell>
  );
}
