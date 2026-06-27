import Link from "next/link";
import { listIssues, createIssue } from "@/lib/actions/newsletter";

export const dynamic = "force-dynamic";

function StatusDot({ status }: { status: string }) {
  const sent = status === "sent";
  const sending = status === "sending";
  const color = sent ? "bg-green-500" : sending ? "bg-amber-500" : "bg-black/20 dark:bg-white/25";
  const label = sent ? "Enviado" : sending ? "Enviando…" : "Borrador";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{label}</span>
    </span>
  );
}

export default async function NewsletterListPage() {
  const issues = await listIssues();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            The Build Log
          </p>
          <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">Newsletter</h1>
        </div>
        <form action={createIssue}>
          <button
            type="submit"
            className="rounded-full bg-gray-900 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Nuevo issue
          </button>
        </form>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        {issues.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400 dark:text-gray-500">
            Aún no hay issues. Crea el primero con “Nuevo issue”.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {issues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/admin/newsletter/${issue.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-stone-50 dark:hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium text-gray-800 dark:text-gray-100">
                      {issue.subject || (
                        <span className="text-gray-300 dark:text-gray-600">Sin subject</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                      Issue {issue.slug}
                    </p>
                  </div>
                  <StatusDot status={issue.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
