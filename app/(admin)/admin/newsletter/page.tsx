import Link from "next/link";
import { cookies } from "next/headers";
import {
  ADMIN_LANGUAGE_COOKIE,
  type AdminLanguage,
  normalizeAdminLanguage,
} from "@/lib/admin/language";
import { listIssues, createIssue, toggleIssueArchiveVisibility } from "@/lib/actions/newsletter";
import { subscriberMetrics } from "@/lib/newsletter/subscriber-metrics";
import { BulkSubscriberImport } from "./components/bulk-subscriber-import";

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
    summary: {
      subscribers: "Suscriptores",
      totalContacts: "contactos totales",
      unsubscribes: "Bajas",
      unsubscribedContacts: "contactos sin suscripción activa",
      historical: "Histórico",
      registeredSubscriptions: "suscripciones registradas",
    },
    growth: {
      label: "Crecimiento",
      title: "Nuevas suscripciones",
      cumulative: "Cumulativo",
      inPeriod: "en",
      monthlyDetail: "Detalle mensual",
      show: "Mostrar",
      hide: "Ocultar",
      empty: "Aún no hay suscripciones con fecha registrada.",
    },
    emailAnalytics: {
      label: "Email analytics",
      title: "Empresas en la audiencia",
      workEmails: "Emails de trabajo",
      personalEmails: "Emails personales",
      notableCompanies: "Big companies",
      topDomains: "Top dominios de empresa",
      notableDomains: "Empresas destacadas",
      recent: "Suscriptores recientes de empresa",
      noData: "Sin datos todavía.",
      empty: "Aún no hay suscriptores con dominio de empresa.",
      domain: "Dominio",
      company: "Empresa",
      date: "Fecha",
      email: "Email",
    },
    attribution: {
      label: "Attribution",
      title: "Origen de suscriptores",
      channel: "Canal",
      source: "Fuente",
      campaign: "Campaña",
      recent: "Suscriptores recientes",
      noData: "Sin datos todavía.",
      direct: "Direct / unknown",
      noCampaign: "No campaign",
      medium: "Medio",
      referrer: "Referrer",
      date: "Fecha",
      email: "Email",
      empty: "Aún no hay suscriptores con fecha registrada.",
    },
    import: {
      label: "Audiencia",
      title: "Importar suscriptores",
    },
    issues: {
      empty: "Aún no hay issues. Crea el primero con \"Nuevo issue\".",
      noSubject: "Sin subject",
    },
    noDate: "Sin fecha",
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
    summary: {
      subscribers: "Subscribers",
      totalContacts: "total contacts",
      unsubscribes: "Unsubscribes",
      unsubscribedContacts: "contacts without an active subscription",
      historical: "Historical",
      registeredSubscriptions: "registered subscriptions",
    },
    growth: {
      label: "Growth",
      title: "New subscriptions",
      cumulative: "Cumulative",
      inPeriod: "in",
      monthlyDetail: "Monthly detail",
      show: "Show",
      hide: "Hide",
      empty: "No dated subscriptions yet.",
    },
    emailAnalytics: {
      label: "Email analytics",
      title: "Companies in the audience",
      workEmails: "Work emails",
      personalEmails: "Personal emails",
      notableCompanies: "Big companies",
      topDomains: "Top company domains",
      notableDomains: "Notable companies",
      recent: "Recent company subscribers",
      noData: "No data yet.",
      empty: "No subscribers with company domains yet.",
      domain: "Domain",
      company: "Company",
      date: "Date",
      email: "Email",
    },
    attribution: {
      label: "Attribution",
      title: "Subscriber origin",
      channel: "Channel",
      source: "Source",
      campaign: "Campaign",
      recent: "Recent subscribers",
      noData: "No data yet.",
      direct: "Direct / unknown",
      noCampaign: "No campaign",
      medium: "Medium",
      referrer: "Referrer",
      date: "Date",
      email: "Email",
      empty: "No dated subscribers yet.",
    },
    import: {
      label: "Audience",
      title: "Import subscribers",
    },
    issues: {
      empty: "No issues yet. Create the first one with \"New issue\".",
      noSubject: "No subject",
    },
    noDate: "No date",
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

function SubscriberLineChart({
  history,
  language,
}: {
  history: { period: string; newSubscribers: number; cumulativeSubscribers: number }[];
  language: AdminLanguage;
}) {
  if (history.length === 0) return null;
  const copy = COPY[language];

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
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {copy.growth.cumulative}
          </p>
          <p className="mt-1 text-2xl font-medium text-gray-800 dark:text-gray-100">
            {latest.cumulativeSubscribers.toLocaleString("es-MX")}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          +{latest.newSubscribers.toLocaleString("es-MX")} {copy.growth.inPeriod} {latest.period}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={copy.growth.title}
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

function hostname(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function formatDate(value: string | null, language: AdminLanguage) {
  if (!value) return COPY[language].noDate;
  return new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function windowLabel(label: string, language: AdminLanguage) {
  if (language === "es") return label;
  if (label === "1 mes") return "1 mo";
  if (label === "Histórico") return "All time";
  return label;
}

function AttributionBreakdown({
  title,
  rows,
  noData,
}: {
  title: string;
  rows: { label: string; count: number }[];
  noData: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">{noData}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                    {row.label}
                  </span>
                </div>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white dark:bg-black/20">
                  <span
                    className="block h-full rounded-full bg-gray-800 dark:bg-gray-100"
                    style={{ width: `${Math.max(5, (row.count / max) * 100)}%` }}
                  />
                </span>
              </div>
              <span className="text-right text-sm font-medium text-gray-800 dark:text-gray-100">
                {row.count.toLocaleString("es-MX")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmailBreakdown({
  title,
  rows,
  noData,
}: {
  title: string;
  rows: { label: string; domain: string; count: number }[];
  noData: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">{noData}</p>
      ) : (
        <div className="mt-4 max-h-96 overflow-y-auto pr-2 [scrollbar-width:thin]">
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={`${row.domain}-${row.label}`} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                      {row.label}
                    </span>
                    {row.label !== row.domain && (
                      <span className="truncate font-mono text-[11px] text-gray-400 dark:text-gray-500">
                        {row.domain}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white dark:bg-black/20">
                    <span
                      className="block h-full rounded-full bg-gray-800 dark:bg-gray-100"
                      style={{ width: `${Math.max(5, (row.count / max) * 100)}%` }}
                    />
                  </span>
                </div>
                <span className="text-right text-sm font-medium text-gray-800 dark:text-gray-100">
                  {row.count.toLocaleString("es-MX")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function NewsletterListPage() {
  const [issues, metrics, cookieStore] = await Promise.all([
    listIssues(),
    subscriberMetrics(),
    cookies(),
  ]);
  const language = normalizeAdminLanguage(cookieStore.get(ADMIN_LANGUAGE_COOKIE)?.value);
  const copy = COPY[language];
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
            {copy.newIssue}
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {copy.summary.subscribers}
          </p>
          <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            {metrics.currentSubscribers.toLocaleString("es-MX")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {metrics.totalContacts.toLocaleString("es-MX")} {copy.summary.totalContacts}
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {copy.summary.unsubscribes}
          </p>
          <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            {metrics.unsubscribedContacts.toLocaleString("es-MX")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {copy.summary.unsubscribedContacts}
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {copy.summary.historical}
          </p>
          <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            {(metrics.windows[metrics.windows.length - 1]?.count ?? 0).toLocaleString("es-MX")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {copy.summary.registeredSubscriptions}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {copy.growth.label}
            </p>
            <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">
              {copy.growth.title}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {metrics.windows.map((window) => (
              <div
                key={window.label}
                className="min-w-20 rounded-xl bg-stone-100 px-3 py-2 text-right dark:bg-white/5"
              >
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  {windowLabel(window.label, language)}
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {window.count.toLocaleString("es-MX")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <SubscriberLineChart history={metrics.history} language={language} />

        <details className="group mt-6 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-stone-50 dark:text-gray-300 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
            <span>{copy.growth.monthlyDetail}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <span className="group-open:hidden">{copy.growth.show}</span>
              <span className="hidden group-open:inline">{copy.growth.hide}</span>
            </span>
          </summary>
          <div className="border-t border-black/5 dark:border-white/10">
            {metrics.history.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                {copy.growth.empty}
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
        </details>
      </section>

      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {copy.emailAnalytics.label}
          </p>
          <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">
            {copy.emailAnalytics.title}
          </h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {copy.emailAnalytics.workEmails}
            </p>
            <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
              {metrics.emailAnalytics.workEmailSubscribers.toLocaleString("es-MX")}
            </p>
          </div>
          <div className="rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {copy.emailAnalytics.personalEmails}
            </p>
            <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
              {metrics.emailAnalytics.personalEmailSubscribers.toLocaleString("es-MX")}
            </p>
          </div>
          <div className="rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {copy.emailAnalytics.notableCompanies}
            </p>
            <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
              {metrics.emailAnalytics.notableCompanySubscribers.toLocaleString("es-MX")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <EmailBreakdown
            title={copy.emailAnalytics.topDomains}
            rows={metrics.emailAnalytics.topCompanyDomains}
            noData={copy.emailAnalytics.noData}
          />
          <EmailBreakdown
            title={copy.emailAnalytics.notableDomains}
            rows={metrics.emailAnalytics.notableCompanies}
            noData={copy.emailAnalytics.noData}
          />
        </div>

        <details className="group mt-5 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-stone-50 dark:text-gray-300 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
            <span>{copy.emailAnalytics.recent}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <span className="group-open:hidden">{copy.growth.show}</span>
              <span className="hidden group-open:inline">{copy.growth.hide}</span>
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-black/5 dark:border-white/10">
            {metrics.emailAnalytics.recentCompanySubscribers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                {copy.emailAnalytics.empty}
              </p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs font-medium text-gray-400 dark:bg-white/[0.03] dark:text-gray-500">
                  <tr>
                    <th className="px-4 py-3">{copy.emailAnalytics.email}</th>
                    <th className="px-4 py-3">{copy.emailAnalytics.date}</th>
                    <th className="px-4 py-3">{copy.emailAnalytics.domain}</th>
                    <th className="px-4 py-3">{copy.emailAnalytics.company}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {metrics.emailAnalytics.recentCompanySubscribers.map((subscriber) => (
                    <tr key={`${subscriber.email}-${subscriber.subscribedAt}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                        {subscriber.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {formatDate(subscriber.subscribedAt, language)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {subscriber.domain}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {subscriber.company ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </details>
      </section>

      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {copy.attribution.label}
          </p>
          <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">
            {copy.attribution.title}
          </h2>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <AttributionBreakdown
            title={copy.attribution.channel}
            rows={metrics.attribution.byChannel}
            noData={copy.attribution.noData}
          />
          <AttributionBreakdown
            title={copy.attribution.source}
            rows={metrics.attribution.bySource}
            noData={copy.attribution.noData}
          />
          <AttributionBreakdown
            title={copy.attribution.campaign}
            rows={metrics.attribution.byCampaign}
            noData={copy.attribution.noData}
          />
        </div>

        <details className="group mt-5 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-stone-50 dark:text-gray-300 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
            <span>{copy.attribution.recent}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              <span className="group-open:hidden">{copy.growth.show}</span>
              <span className="hidden group-open:inline">{copy.growth.hide}</span>
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-black/5 dark:border-white/10">
            {metrics.attribution.recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                {copy.attribution.empty}
              </p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs font-medium text-gray-400 dark:bg-white/[0.03] dark:text-gray-500">
                  <tr>
                    <th className="px-4 py-3">{copy.attribution.email}</th>
                    <th className="px-4 py-3">{copy.attribution.date}</th>
                    <th className="px-4 py-3">{copy.attribution.source}</th>
                    <th className="px-4 py-3">{copy.attribution.medium}</th>
                    <th className="px-4 py-3">{copy.attribution.campaign}</th>
                    <th className="px-4 py-3">{copy.attribution.referrer}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {metrics.attribution.recent.map((subscriber) => (
                    <tr key={`${subscriber.email}-${subscriber.subscribedAt}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                        {subscriber.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {formatDate(subscriber.subscribedAt, language)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {subscriber.source ?? copy.attribution.direct}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {subscriber.medium ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {subscriber.campaign ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                        {hostname(subscriber.referrer) ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </details>
      </section>

      <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {copy.import.label}
          </p>
          <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">
            {copy.import.title}
          </h2>
        </div>
        <BulkSubscriberImport language={language} />
      </section>

      <div className="mt-10 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        {issues.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400 dark:text-gray-500">
            {copy.issues.empty}
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
