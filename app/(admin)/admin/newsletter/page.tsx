import Link from "next/link";
import { listIssues, createIssue, toggleIssueArchiveVisibility } from "@/lib/actions/newsletter";
import { subscriberMetrics } from "@/lib/newsletter/subscriber-metrics";
import { BulkSubscriberImport } from "./components/bulk-subscriber-import";

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

function ArchiveToggle({
  id,
  status,
  archivePublished,
}: {
  id: string;
  status: string;
  archivePublished: boolean;
}) {
  const sent = status === "sent";

  if (!sent) {
    return (
      <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-gray-400 dark:bg-white/5 dark:text-gray-500">
        No publicado
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
        {archivePublished ? "Visible en archivo" : "Oculto del archivo"}
      </button>
    </form>
  );
}

function SubscriberLineChart({
  history,
}: {
  history: { period: string; newSubscribers: number; cumulativeSubscribers: number }[];
}) {
  if (history.length === 0) return null;

  const width = 720;
  const height = 220;
  const padding = { top: 18, right: 24, bottom: 38, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...history.map((point) => point.cumulativeSubscribers));
  const min = Math.min(...history.map((point) => point.cumulativeSubscribers));
  const span = Math.max(1, max - min);

  const xFor = (index: number) =>
    padding.left + (history.length === 1 ? chartWidth : (index / (history.length - 1)) * chartWidth);
  const yFor = (value: number) => padding.top + chartHeight - ((value - min) / span) * chartHeight;
  const points = history.map((point, index) => ({
    ...point,
    x: xFor(index),
    y: yFor(point.cumulativeSubscribers),
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const latest = history[history.length - 1];
  const ticks = [max, Math.round(min + span / 2), min];
  const labels = Array.from(
    new Set([history[0], history[Math.floor((history.length - 1) / 2)], latest]),
  );

  return (
    <div className="mt-6 rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Cumulativo</p>
          <p className="mt-1 text-2xl font-medium text-gray-800 dark:text-gray-100">
            {latest.cumulativeSubscribers.toLocaleString("es-MX")}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          +{latest.newSubscribers.toLocaleString("es-MX")} en {latest.period}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Crecimiento acumulado de suscriptores por mes"
        className="mt-4 h-56 w-full overflow-visible"
      >
        {ticks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="stroke-black/5 dark:stroke-white/10"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-[11px]"
              >
                {tick.toLocaleString("es-MX")}
              </text>
            </g>
          );
        })}
        <path
          d={`${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padding.bottom} L ${points[0].x.toFixed(1)} ${height - padding.bottom} Z`}
          className="fill-gray-800/5 dark:fill-white/5"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-800 dark:text-gray-100"
        />
        {points.map((point) => (
          <circle
            key={point.period}
            cx={point.x}
            cy={point.y}
            r={point === points[points.length - 1] ? 4 : 2.5}
            className="fill-white stroke-gray-800 dark:fill-neutral-900 dark:stroke-gray-100"
            strokeWidth="2"
          />
        ))}
        {labels.map((point) => (
          <text
            key={point.period}
            x={xFor(history.indexOf(point))}
            y={height - 12}
            textAnchor="middle"
            className="fill-gray-400 text-[11px]"
          >
            {point.period}
          </text>
        ))}
      </svg>
    </div>
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

        <SubscriberLineChart history={metrics.history} />

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

      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Audiencia</p>
          <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">
            Importar suscriptores
          </h2>
        </div>
        <BulkSubscriberImport />
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
                <div className="grid gap-4 px-6 py-4 transition hover:bg-stone-50 sm:grid-cols-[1fr_auto_auto] sm:items-center dark:hover:bg-white/5">
                  <div className="min-w-0">
                    <Link href={`/admin/newsletter/${issue.id}`} className="block min-w-0">
                      <p className="truncate text-lg font-medium text-gray-800 transition hover:text-black dark:text-gray-100 dark:hover:text-white">
                        {issue.subject || (
                          <span className="text-gray-300 dark:text-gray-600">Sin subject</span>
                        )}
                      </p>
                    </Link>
                    <p className="mt-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                      Issue {issue.slug}
                    </p>
                  </div>
                  <ArchiveToggle
                    id={issue.id}
                    status={issue.status}
                    archivePublished={issue.archivePublished}
                  />
                  <StatusDot status={issue.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
