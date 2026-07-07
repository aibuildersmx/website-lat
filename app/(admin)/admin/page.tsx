import { redirect } from "next/navigation";

// Keep the admin index on the publishing workflow; audience management has its
// own sidebar entry.
export default function AdminHome() {
  redirect("/admin/newsletter");
}
