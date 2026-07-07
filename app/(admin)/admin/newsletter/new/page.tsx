import { NewIssueCreator } from "./new-issue-creator";
import { getNewIssueDraftData } from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

export default async function NewNewsletterIssuePage() {
  const initialData = await getNewIssueDraftData();
  return <NewIssueCreator initialData={initialData} />;
}
