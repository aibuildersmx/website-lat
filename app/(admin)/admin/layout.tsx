import { redirect } from "next/navigation";
import { getUser, signOut } from "@/lib/auth";
import { AdminShell } from "./components/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AdminShell email={user.email} signOutAction={signOut}>
      {children}
    </AdminShell>
  );
}
