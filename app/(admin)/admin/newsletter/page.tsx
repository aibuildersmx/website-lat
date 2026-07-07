import Link from "next/link";
import { cookies } from "next/headers";
import {
  ADMIN_LANGUAGE_COOKIE,
  type AdminLanguage,
  normalizeAdminLanguage,
} from "@/lib/admin/language";
import { listIssues, toggleIssueArchiveVisibility } from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

const COPY = {
  es: {
    newIssue: "Nuevo issue",
    status: {
      sent: "Enviado",
      sending: "Enviando...",
      draft: "Borrador",
      unpublished: "No publicado",
      visibleArchive: "Visible en archivo",
      hiddenArchive: "Oculto del archivo",
    },
    issues: {
      empty: "Aún no hay issues. Crea el primero con \"Nuevo issue\".",
      noSubject: "Sin subject",
    },
  },
  en: {
    newIssue: "New issue",
    status: {
      sent: "Sent",
      sending: "Sending...",
      draft: "Draft",
      unpublished: "Unpublished",
      visibleArchive: "Visible in archive",
      hiddenArchive: "Hidden from archive",
    },
    issues: {
      empty: "No issues yet. Create the first one with \"New issue\".",
      noSubject: "No subject",
    },
  },
} as const;

function StatusDot({ status, language }: { status: string; language: AdminLanguage }) {
  const sent = status === "sent";
  const sending = status === "sending";
  const color = sent ? "bg-green-500" : sending ? "bg-amber-500" : "bg-black/20 dark:bg-white/25";
  const copy = COPY[language];
  const label = sent ? copy.status.sent : sending ? copy.status.sending : copy.status.draft;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{label}</span>
    </span>
  );
}

function ArchiveToggle({
  id,
  status,
  archivePublished,
  language,
}: {
  id: string;
  status: string;
  archivePublished: boolean;
  language: AdminLanguage;
}) {
  const sent = status === "sent";
  const copy = COPY[language];

  if (!sent) {
    return (
      <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-gray-400 dark:bg-white/5 dark:text-gray-500">
        {copy.status.unpublished}
      </span>
    );
  }

  return (
    <form action={toggleIssueArchiveVisibility}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="archivePublished" value={archivePublished ? "false" : "true"} />
      <button
        type="submit"
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
          archivePublished
            ? "bg-green-500/10 text-green-700 hover:bg-green-500/15 dark:text-green-400"
            : "bg-black/5 text-gray-500 hover:bg-black/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
        }`}
      >
        {archivePublished ? copy.status.visibleArchive : copy.status.hiddenArchive}
      </button>
    </form>
  );
}

export default async function NewsletterListPage() {
  const [issues, cookieStore] = await Promise.all([listIssues(), cookies()]);
  const language = normalizeAdminLanguage(cookieStore.get(ADMIN_LANGUAGE_COOKIE)?.value);
  const copy = COPY[language];

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">The Build Log</p>
          <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">
            Newsletter
          </h1>
        </div>
        <Link
          href="/admin/newsletter/new"
          className="cursor-pointer rounded-full bg-gray-900 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {copy.newIssue}
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        {issues.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400 dark:text-gray-500">
            {copy.issues.empty}
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {issues.map((issue) => {
              const href =
                issue.status === "sent"
                  ? `/admin/newsletter/sent/${issue.id}`
                  : `/admin/newsletter/${issue.id}`;

              return (
              <li key={issue.id}>
                <div className="grid gap-4 px-6 py-4 transition hover:bg-stone-50 sm:grid-cols-[1fr_auto_auto] sm:items-center dark:hover:bg-white/5">
                  <div className="min-w-0">
                    <Link href={href} className="block min-w-0">
                      <p className="truncate text-lg font-medium text-gray-800 transition hover:text-black dark:text-gray-100 dark:hover:text-white">
                        {issue.subject || (
                          <span className="text-gray-300 dark:text-gray-600">
                            {copy.issues.noSubject}
                          </span>
                        )}
                      </p>
                    </Link>
                    <p className="mt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                      Issue {issue.slug}
                      {issue.date ? ` · ${issue.date}` : ""}
                    </p>
                  </div>
                  <ArchiveToggle
                    id={issue.id}
                    status={issue.status}
                    archivePublished={issue.archivePublished}
                    language={language}
                  />
                  <StatusDot status={issue.status} language={language} />
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
