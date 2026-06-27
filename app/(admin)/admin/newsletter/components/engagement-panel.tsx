import type { IssueEngagement } from "@/lib/actions/newsletter";

const pct = (r: number) => `${Math.round(r * 100)}%`;

// Strip protocol/www for a readable link label; keep the path so similar links differ.
function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-medium text-gray-800 tabular-nums dark:text-gray-100">
        {value}
      </p>
      {detail && <p className="text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
    </div>
  );
}

// Per-issue engagement, shown above the composer for sent issues. Clicks/CTR lead
// (trustworthy); opens are marked approximate (Apple/Gmail inflate them).
export function EngagementPanel({ data }: { data: IssueEngagement }) {
  return (
    <div className="mx-auto mb-8 max-w-[680px] rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Engagement
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {data.sent.toLocaleString("es-MX")} entregados
        </span>
      </div>

      {!data.hasData ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Aún sin aperturas ni clics registrados. El tracking corre desde el issue 003.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
            <Metric
              label="Clics"
              value={pct(data.clickRate)}
              detail={`${data.clicks.toLocaleString("es-MX")} personas`}
            />
            <Metric
              label="Aperturas · aprox."
              value={pct(data.openRate)}
              detail={`${data.opens.toLocaleString("es-MX")} personas`}
            />
          </div>

          {data.topLinks.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Links más clickeados
              </p>
              <ul className="mt-2">
                {data.topLinks.map((l) => (
                  <li
                    key={l.url}
                    className="flex items-baseline justify-between gap-4 border-t border-black/5 py-2 dark:border-white/10"
                  >
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-gray-700 hover:underline dark:text-gray-200"
                    >
                      {prettyUrl(l.url)}
                    </a>
                    <span className="shrink-0 text-xs font-medium text-gray-500 tabular-nums dark:text-gray-400">
                      {l.clicks.toLocaleString("es-MX")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
