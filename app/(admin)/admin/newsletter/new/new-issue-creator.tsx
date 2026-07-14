"use client";

import { useRouter } from "next/navigation";
import type { Issue } from "@/lib/newsletter/types";
import { IssueEditor } from "../components/issue-editor";

export function NewIssueCreator({ initialData }: { initialData: Issue }) {
  const router = useRouter();

  return (
    <IssueEditor
      id={null}
      initialData={initialData}
      status="draft"
      initialProgress={{
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        issueStatus: "draft",
        warmingUp: false,
      }}
      engagement={null}
      onIssueCreated={(id) => router.replace(`/admin/newsletter/${id}`)}
    />
  );
}
