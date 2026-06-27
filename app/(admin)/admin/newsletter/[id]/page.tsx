import { notFound } from "next/navigation";
import { getIssue, getIssueProgress, getIssueEngagement } from "@/lib/actions/newsletter";
import { IssueEditor } from "../components/issue-editor";

export const dynamic = "force-dynamic";

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getIssue(id);
  if (!issue) notFound();

  const progress = await getIssueProgress(id);
  // Engagement only matters once an issue is out the door.
  const engagement = issue.status === "sent" ? await getIssueEngagement(id) : null;

  return (
    <div>
      <IssueEditor
        id={issue.id}
        initialData={issue.data}
        status={issue.status}
        initialProgress={progress}
        engagement={engagement}
      />
    </div>
  );
}
