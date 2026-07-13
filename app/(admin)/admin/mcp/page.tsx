import { listMcpTokens, revokeMcpToken } from "@/lib/actions/mcp";
import { McpTokenManager } from "./components/mcp-token-manager";

export const dynamic = "force-dynamic";

function endpointUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  try {
    return new URL("/api/mcp", base).toString();
  } catch {
    return "http://localhost:3000/api/mcp";
  }
}

function date(value: string | null): string {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function McpAdminPage() {
  const tokens = await listMcpTokens();
  const endpoint = endpointUrl();

  return (
    <div>
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Admin</p>
        <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">Conexiones MCP</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Conecta Codex o Claude Code para trabajar con borradores de The Build Log desde tu terminal.
        </p>
      </div>

      <div className="mt-8"><McpTokenManager endpoint={endpoint} /></div>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Credenciales</p>
        <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">Tokens creados</h2>
        <div className="mt-5 divide-y divide-black/5 dark:divide-white/10">
          {tokens.length === 0 && <p className="py-5 text-sm text-gray-500 dark:text-gray-400">Todavía no hay tokens.</p>}
          {tokens.map((token) => {
            const active = !token.revokedAt && new Date(token.expiresAt) > new Date();
            return (
              <div key={token.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{token.name}</p>
                    <span className={`rounded-full px-2 py-1 font-mono text-[10px] font-bold uppercase ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"}`}>
                      {active ? "Activo" : token.revokedAt ? "Revocado" : "Vencido"}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-gray-400">{token.tokenPrefix}</p>
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Último uso: {date(token.lastUsedAt)} · Vence: {date(token.expiresAt)}
                  </p>
                </div>
                {active && (
                  <form action={revokeMcpToken}>
                    <input type="hidden" name="id" value={token.id} />
                    <button type="submit" className="rounded-full border border-red-200 px-4 py-2 font-mono text-[11px] font-bold uppercase text-red-600 transition hover:border-red-400 dark:border-red-500/30 dark:text-red-400">
                      Revocar
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
