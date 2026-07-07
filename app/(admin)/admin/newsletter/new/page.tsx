import { redirect } from "next/navigation";
import { createIssueDraft } from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

export default async function NewNewsletterIssuePage() {
  const id = await createIssueDraft();
  redirect(`/admin/newsletter/${id}`);
}
