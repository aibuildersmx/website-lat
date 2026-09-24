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

// "24 Sep 2026" — the same shape Build Log dates use, so both kinds sort together.
function listDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(date).replace("Sept", "Sep");
}

// Standalone emails have no issue date: they are dated by when they went out
// (or were last edited), and they never reach the public archive.
export function listIssueItem({ data, ...row }: ListRow): IssueListItem {
  if (row.kind === "standalone") {
    return { ...row, date: listDate(row.sentAt ?? row.updatedAt), archivePublished: false };
  }
  return { ...row, date: data.date, archivePublished: data.archivePublished !== false };
}

const MONTH_INDEX: Record<string, number> = {
  ene: 0,
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  apr: 3,
  april: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  september: 8,
  oct: 9,
  octubre: 9,
  october: 9,
  nov: 10,
  noviembre: 10,
  november: 10,
  dic: 11,
  diciembre: 11,
  dec: 11,
  december: 11,
};

function issueDateSortValue(date: string): number | null {
  const normalized = date
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .toLowerCase();
  const year = normalized.match(/\b(20\d{2})\b/)?.[1];
  if (!year) return null;

  const month = [...normalized.matchAll(/\b[a-z]{3,10}\b/g)]
    .map((match) => match[0])
    .filter((word) => word in MONTH_INDEX)
    .at(-1);
  if (!month) return null;

  const day = [...normalized.matchAll(/\b\d{1,2}\b/g)]
    .map((match) => Number(match[0]))
    .filter((value) => value >= 1 && value <= 31)
    .at(-1);
  if (!day) return null;

  return Date.UTC(Number(year), MONTH_INDEX[month], day);
}

function issueSlugSortValue(slug: string): number {
  const numeric = Number(slug);
  return Number.isFinite(numeric) ? numeric : -1;
}

// Newest first by issue date; undated rows last, then by issue number, then by edit time.
export function sortIssueList(items: IssueListItem[]): IssueListItem[] {
  return [...items].sort((a, b) => {
    const aDate = issueDateSortValue(a.date);
    const bDate = issueDateSortValue(b.date);
    if (aDate !== null && bDate !== null && aDate !== bDate) return bDate - aDate;
    if (aDate !== null && bDate === null) return -1;
    if (aDate === null && bDate !== null) return 1;

    const slugDiff = issueSlugSortValue(b.slug) - issueSlugSortValue(a.slug);
    if (slugDiff !== 0) return slugDiff;

    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
