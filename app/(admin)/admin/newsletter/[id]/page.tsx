import { notFound, redirect } from "next/navigation";
import { getIssue, getIssueProgress } from "@/lib/actions/newsletter";
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
  if (issue.status === "sent") redirect(`/admin/newsletter/sent/${id}`);

  const progress = await getIssueProgress(id);

  return (
    <div>
      <IssueEditor
        id={issue.id}
        initialData={issue.data}
        status={issue.status}
        initialProgress={progress}
        engagement={null}
      />
    </div>
  );
}
