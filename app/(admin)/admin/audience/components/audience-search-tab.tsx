"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminLanguage } from "@/lib/admin/language";
import type { AudienceSubscriberSearch } from "@/lib/newsletter/subscriber-metrics";

const COPY = {
  es: {
    label: "Suscriptores",
    title: "Buscar audiencia",
    placeholder: "email, dominio, campaña, source, tag...",
    submit: "Buscar",
    clear: "Limpiar",
    loading: "Buscando...",
    showing: "Mostrando",
    of: "de",
    results: "resultados",
    latest: "contactos recientes",
    empty: "No encontramos suscriptores con esa búsqueda.",
    error: "No se pudo completar la búsqueda.",
    status: "Estado",
    active: "Activo",
    unsubscribed: "Baja",
    source: "Source",
    campaign: "Campaña",
    tags: "Tags / fuentes",
    email: "Email",
    noDate: "Sin fecha",
  },
  en: {
    label: "Subscribers",
    title: "Search audience",
    placeholder: "email, domain, campaign, source, tag...",
    submit: "Search",
    clear: "Clear",
    loading: "Searching...",
    showing: "Showing",
    of: "of",
    results: "results",
    latest: "recent contacts",
    empty: "No subscribers matched that search.",
    error: "Search could not be completed.",
    status: "Status",
    active: "Active",
    unsubscribed: "Unsubscribed",
    source: "Source",
    campaign: "Campaign",
    tags: "Tags / sources",
    email: "Email",
    noDate: "No date",
  },
} as const;

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

export function AudienceSearchTab({
  initialSearch,
  language,
}: {
  initialSearch: AudienceSubscriberSearch;
  language: AdminLanguage;
}) {
  const copy = COPY[language];
  const [query, setQuery] = useState(initialSearch.query);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceReadyRef = useRef(false);

  const runSearch = useCallback(async (nextQuery: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/audience/search?q=${encodeURIComponent(nextQuery)}`,
        {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const data = (await response.json()) as AudienceSubscriberSearch;
      setSearch(data);
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === "AbortError") return;
      setError(copy.error);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [copy.error]);

  useEffect(() => {
    if (!debounceReadyRef.current) {
      debounceReadyRef.current = true;
      return;
    }
    const timeout = window.setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query, runSearch]);

  const hasQuery = search.query.length > 0;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
      <div className="border-b border-black/5 p-5 dark:border-white/10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {copy.title}
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? (
              copy.loading
            ) : (
              <>
                {copy.showing} {search.subscribers.length.toLocaleString("es-MX")}{" "}
                {hasQuery
                  ? `${copy.of} ${search.total.toLocaleString("es-MX")} ${copy.results}`
                  : copy.latest}
              </>
            )}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch(query);
          }}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <input
            name="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={copy.placeholder}
            className="min-h-11 flex-1 rounded-xl border border-black/10 bg-white px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-black/30 dark:border-white/15 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/35"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-900 px-5 font-mono text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {copy.submit}
            </button>
            {(query || hasQuery) && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/10 px-5 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-700 transition hover:border-black/25 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30"
              >
                {copy.clear}
              </button>
            )}
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {search.subscribers.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
          {copy.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs font-medium text-gray-400 dark:bg-white/[0.03] dark:text-gray-500">
              <tr>
                <th className="px-5 py-3">{copy.email}</th>
                <th className="px-5 py-3">{copy.status}</th>
                <th className="px-5 py-3">{copy.source}</th>
                <th className="px-5 py-3">{copy.campaign}</th>
                <th className="px-5 py-3">{copy.tags}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {search.subscribers.map((subscriber) => {
                const chips = [
                  ...subscriber.tags.map((label, index) => ({
                    key: `tag-${index}-${label}`,
                    label,
                  })),
                  ...subscriber.sources.map((label, index) => ({
                    key: `source-${index}-${label}`,
                    label,
                  })),
                ].slice(0, 4);
                return (
                  <tr key={subscriber.email}>
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        {subscriber.email}
                      </p>
                      {subscriber.name && (
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {subscriber.name}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          subscriber.newsletterSubscribed
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300"
                        }`}
                      >
                        {subscriber.newsletterSubscribed ? copy.active : copy.unsubscribed}
                      </span>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(
                          subscriber.newsletterSubscribed
                            ? subscriber.subscribedAt
                            : subscriber.unsubscribedAt,
                          language,
                        )}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-500 dark:text-gray-400">
                      {subscriber.source ?? hostname(subscriber.referrer) ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-500 dark:text-gray-400">
                      {subscriber.campaign ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      {chips.length === 0 ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : (
                        <div className="flex max-w-md flex-wrap gap-1.5">
                          {chips.map((chip) => (
                            <span
                              key={chip.key}
                              className="rounded-full bg-black/5 px-2 py-1 font-mono text-[11px] text-gray-500 dark:bg-white/10 dark:text-gray-300"
                            >
                              {chip.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
