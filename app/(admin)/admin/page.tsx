import { redirect } from "next/navigation";

// The newsletter is the only admin section in this app, so the index just
// forwards there.
export default function AdminHome() {
  redirect("/admin/newsletter");
}
