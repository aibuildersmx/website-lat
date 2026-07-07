import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getIssue, getIssueEngagement } from "@/lib/actions/newsletter";
import { renderBuildLog } from "@/lib/newsletter/render";
import { stripTracking } from "@/lib/newsletter/tracking";
import { EngagementPanel } from "../../components/engagement-panel";

export const dynamic = "force-dynamic";

function previewHtml(issue: Parameters<typeof renderBuildLog>[0]): string {
  return stripTracking(
    renderBuildLog(issue).replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#"),
  );
}

function formatDate(date: Date | null): string {
  if (!date) return "Fecha de envío no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function SentNewsletterIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getIssue(id);
  if (!issue) notFound();
  if (issue.status !== "sent") redirect(`/admin/newsletter/${id}`);

  const engagement = await getIssueEngagement(id);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin/newsletter"
            className="text-sm font-medium text-gray-400 transition hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          >
            Newsletter
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-medium text-gray-800 dark:text-gray-100">
              Issue {issue.data.slug}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-bold text-green-700 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Enviado
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            {issue.data.subject || "Sin subject"} · {formatDate(issue.sentAt)}
          </p>
        </div>
        <Link
          href={`/newsletters/${issue.data.slug}`}
          target="_blank"
          className="rounded-full border border-black/10 px-4 py-2 font-sans text-xs font-bold uppercase tracking-normal text-gray-600 transition hover:border-black/30 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40"
        >
          Ver público
        </Link>
      </div>

      <EngagementPanel data={engagement} />

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        <div className="border-b border-black/5 px-5 py-3 dark:border-white/10">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Email enviado
          </p>
        </div>
        <iframe
          title={`Issue ${issue.data.slug}`}
          srcDoc={previewHtml(issue.data)}
          className="h-[78vh] w-full bg-black"
        />
      </div>
    </div>
  );
}
