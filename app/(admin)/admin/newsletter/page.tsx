import Link from "next/link";
import { listIssues, createIssue } from "@/lib/actions/newsletter";
import { subscriberMetrics } from "@/lib/newsletter/subscriber-metrics";

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
  const [issues, metrics] = await Promise.all([listIssues(), subscriberMetrics()]);
  const maxMonthlySubscribers = Math.max(
    1,
    ...metrics.history.map((point) => point.newSubscribers),
  );

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

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Suscriptores</p>
          <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            {metrics.currentSubscribers.toLocaleString("es-MX")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {metrics.totalContacts.toLocaleString("es-MX")} contactos totales
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Bajas</p>
          <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            {metrics.unsubscribedContacts.toLocaleString("es-MX")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            contactos sin suscripción activa
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Histórico</p>
          <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            {(metrics.windows.find((w) => w.label === "Histórico")?.count ?? 0).toLocaleString("es-MX")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            suscripciones registradas
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Crecimiento</p>
            <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">
              Nuevas suscripciones
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {metrics.windows.map((window) => (
              <div
                key={window.label}
                className="min-w-20 rounded-xl bg-stone-100 px-3 py-2 text-right dark:bg-white/5"
              >
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  {window.label}
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {window.count.toLocaleString("es-MX")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
          {metrics.history.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Aún no hay suscripciones con fecha registrada.
            </p>
          ) : (
            <ul className="divide-y divide-black/5 dark:divide-white/10">
              {metrics.history.map((point) => (
                <li
                  key={point.period}
                  className="grid grid-cols-[7rem_1fr_6rem] items-center gap-4 px-4 py-3 text-sm"
                >
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {point.period}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
                    <span
                      className="block h-full rounded-full bg-gray-800 dark:bg-gray-100"
                      style={{
                        width: `${Math.max(4, (point.newSubscribers / maxMonthlySubscribers) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="text-right text-gray-500 dark:text-gray-400">
                    +{point.newSubscribers.toLocaleString("es-MX")} /{" "}
                    {point.cumulativeSubscribers.toLocaleString("es-MX")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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
