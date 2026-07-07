"use client";

import { useMemo, useState } from "react";

export function CompanyBreakdown({
  title,
  rows,
  noData,
}: {
  title: string;
  rows: { label: string; domain: string; count: number }[];
  noData: string;
}) {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter(
      (row) =>
        row.label.toLowerCase().includes(normalized) ||
        row.domain.toLowerCase().includes(normalized),
    );
  }, [query, rows]);
  const max = Math.max(1, ...filteredRows.map((row) => row.count));

  return (
    <div className="flex h-[24rem] flex-col rounded-xl border border-black/5 bg-stone-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">{title}</h3>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search"
          className="min-h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-black/30 sm:w-44 dark:border-white/15 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/35"
        />
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2 [scrollbar-width:thin]">
        {filteredRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{noData}</p>
        ) : (
          <ul className="space-y-3">
            {filteredRows.map((row) => (
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
        )}
      </div>
    </div>
  );
}
