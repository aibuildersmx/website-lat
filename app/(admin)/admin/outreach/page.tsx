import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { OutreachComposer } from "./outreach-composer";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const user = await getUser();
  if (!user || user.role !== "admin") redirect("/login");

  return (
    <OutreachComposer
      fromEmail={process.env.NEWSLETTER_FROM?.trim() || "NEWSLETTER_FROM no configurado"}
      replyToEmail={user.email}
    />
  );
}
