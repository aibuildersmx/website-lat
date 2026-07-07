import { cookies } from "next/headers";
import {
  ADMIN_LANGUAGE_COOKIE,
  type AdminLanguage,
  normalizeAdminLanguage,
} from "@/lib/admin/language";
import {
  searchAudienceSubscribers,
  subscriberMetrics,
} from "@/lib/newsletter/subscriber-metrics";
import { AudienceSearchTab } from "./components/audience-search-tab";
import { AudienceTabs } from "./components/audience-tabs";
import { CompanyBreakdown } from "./components/company-breakdown";
import { BulkSubscriberImport } from "../newsletter/components/bulk-subscriber-import";

export const dynamic = "force-dynamic";

const COPY = {
  es: {
    tabs: {
      search: "Buscar",
      companies: "Empresas",
      attribution: "Attribution",
      import: "Importar",
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
      title: "Nuevas suscripciones",
      chart: "Gráfica",
      cumulative: "Cumulativo",
      added: "Agregados",
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
    search: {
      label: "Suscriptores",
      title: "Buscar audiencia",
      placeholder: "email, dominio, campaña, source, tag...",
      submit: "Buscar",
      clear: "Limpiar",
      showing: "Mostrando",
      of: "de",
      results: "resultados",
      latest: "contactos recientes",
      empty: "No encontramos suscriptores con esa búsqueda.",
      status: "Estado",
      active: "Activo",
      unsubscribed: "Baja",
      source: "Source",
      campaign: "Campaña",
      tags: "Tags / fuentes",
    },
    noDate: "Sin fecha",
  },
  en: {
    tabs: {
      search: "Search",
      companies: "Companies",
      attribution: "Attribution",
      import: "Import",
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
      chart: "Chart",
      cumulative: "Cumulative",
      added: "Added",
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
    search: {
      label: "Subscribers",
      title: "Search audience",
      placeholder: "email, domain, campaign, source, tag...",
      submit: "Search",
      clear: "Clear",
      showing: "Showing",
      of: "of",
      results: "results",
      latest: "recent contacts",
      empty: "No subscribers matched that search.",
      status: "Status",
      active: "Active",
      unsubscribed: "Unsubscribed",
      source: "Source",
      campaign: "Campaign",
      tags: "Tags / sources",
    },
    noDate: "No date",
  },
} as const;

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
    <div className="mt-4 rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
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
        {points.map((point) => {
          const tooltipWidth = 128;
          const tooltipHeight = 48;
          const tooltipX = Math.min(
            width - padding.right - tooltipWidth,
            Math.max(padding.left, point.x - tooltipWidth / 2),
          );
          const tooltipY = Math.max(padding.top, point.y - tooltipHeight - 12);

          return (
            <g
              key={point.period}
              tabIndex={0}
              className="group outline-none"
              aria-label={`${point.period}: ${copy.growth.cumulative} ${point.cumulativeSubscribers.toLocaleString("es-MX")}, ${copy.growth.added} ${point.newSubscribers.toLocaleString("es-MX")}`}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                className="fill-transparent"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={point === points[points.length - 1] ? 4 : 2.5}
                className="fill-white stroke-gray-800 transition group-hover:fill-gray-800 group-focus:fill-gray-800 dark:fill-neutral-900 dark:stroke-gray-100 dark:group-hover:fill-gray-100 dark:group-focus:fill-gray-100"
                strokeWidth="2"
              />
              <g className="pointer-events-none opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx="8"
                  className="fill-white stroke-black/10 dark:fill-neutral-950 dark:stroke-white/15"
                />
                <text
                  x={tooltipX + 10}
                  y={tooltipY + 17}
                  className="fill-gray-500 text-[10px] font-medium dark:fill-gray-400"
                >
                  {point.period}
                </text>
                <text
                  x={tooltipX + 10}
                  y={tooltipY + 33}
                  className="fill-gray-800 text-[11px] font-medium dark:fill-gray-100"
                >
                  {copy.growth.cumulative}: {point.cumulativeSubscribers.toLocaleString("es-MX")}
                </text>
                <text
                  x={tooltipX + 10}
                  y={tooltipY + 45}
                  className="fill-gray-500 text-[10px] dark:fill-gray-400"
                >
                  +{point.newSubscribers.toLocaleString("es-MX")} {copy.growth.added}
                </text>
              </g>
            </g>
          );
        })}
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

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const [metrics, search, cookieStore] = await Promise.all([
    subscriberMetrics(),
    searchAudienceSubscribers(query),
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
      <div>
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            The Build Log
          </p>
          <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">Audience</h1>
        </div>
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
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
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

        <AudienceTabs
          labels={[copy.growth.chart, copy.growth.monthlyDetail]}
          panelClassName="min-h-[24rem]"
        >
          <SubscriberLineChart history={metrics.history} language={language} />

          <div className="mt-4 overflow-hidden rounded-xl border border-black/5 dark:border-white/10">
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
        </AudienceTabs>
      </section>

      <AudienceTabs
        labels={[
          copy.tabs.search,
          copy.tabs.companies,
          copy.tabs.attribution,
          copy.tabs.import,
        ]}
      >
        <AudienceSearchTab initialSearch={search} language={language} />

        <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
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
          <CompanyBreakdown
            title={copy.emailAnalytics.topDomains}
            rows={metrics.emailAnalytics.topCompanyDomains}
            noData={copy.emailAnalytics.noData}
          />
          <CompanyBreakdown
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
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
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

        </section>

        <section className="mt-4 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            {copy.import.title}
          </h2>
        </div>
        <BulkSubscriberImport language={language} />
        </section>
      </AudienceTabs>

    </div>
  );
}
