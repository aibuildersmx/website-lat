import type { NewsletterIssueRow } from "@/lib/db/schema";
import type { EmailKind } from "./standalone-types";

export interface IssueListItem {
  id: string;
  kind: EmailKind;
  slug: string;
  subject: string;
  status: string;
  archivePublished: boolean;
  date: string;
  sentAt: Date | null;
  updatedAt: Date;
}

type ListRow = Pick<NewsletterIssueRow, "id" | "kind" | "slug" | "subject" | "status" | "data" | "sentAt" | "updatedAt">;

// Standalone emails have no issue date and never reach the public archive.
export function listIssueItem({ data, ...row }: ListRow): IssueListItem {
  if (row.kind === "standalone") return { ...row, date: "", archivePublished: false };
  return { ...row, date: data.date, archivePublished: data.archivePublished !== false };
}
