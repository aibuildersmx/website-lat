"use client";

import { useActionState, useState } from "react";
import { createMcpToken, type CreateMcpTokenState } from "@/lib/actions/mcp";

const INITIAL_STATE: CreateMcpTokenState = {};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_500);
      }}
      className="shrink-0 rounded-full border border-black/10 px-4 py-2 font-mono text-[11px] font-bold uppercase text-gray-600 transition hover:border-black/30 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/35"
    >
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function McpTokenManager({ endpoint }: { endpoint: string }) {
  const [state, action, pending] = useActionState(createMcpToken, INITIAL_STATE);
  const codexConfig = `[mcp_servers.ai_builders_newsletters]\nurl = "${endpoint}"\nbearer_token_env_var = "AI_BUILDERS_MCP_TOKEN"`;
  const claudeConfig = JSON.stringify({
    mcpServers: {
      "ai-builders-newsletters": {
        type: "http",
        url: endpoint,
        headers: { Authorization: "Bearer ${AI_BUILDERS_MCP_TOKEN}" },
      },
    },
  }, null, 2);

  return (
    <div className="space-y-6">
      <form action={action} className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Nueva conexión</p>
        <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">Crear token personal</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          El token vence en 90 días. Solo permite leer, crear y editar borradores; no puede publicar, enviar ni eliminar newsletters.
        </p>
        <div className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            maxLength={80}
            placeholder="MacBook de Ben"
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-black/30 dark:border-white/15 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-gray-900 px-5 py-3 font-mono text-[11px] font-bold uppercase text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {pending ? "Creando…" : "Crear token"}
          </button>
        </div>
        {state.error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      </form>

      {state.token && (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-950/20">
          <p className="font-mono text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300">Guárdalo ahora</p>
          <h2 className="mt-1 text-lg font-medium text-gray-900 dark:text-white">Este token se muestra una sola vez</h2>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white p-3 dark:bg-neutral-950">
            <code className="min-w-0 flex-1 break-all text-xs text-gray-700 dark:text-gray-200">{state.token}</code>
            <CopyButton value={state.token} />
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Define <code>AI_BUILDERS_MCP_TOKEN</code> con este valor en tu terminal antes de abrir Codex o Claude Code.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Configuración</p>
        <h2 className="mt-1 text-lg font-medium text-gray-800 dark:text-gray-100">Conectar tu agente</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <ConfigBlock title="Codex · config.toml" value={codexConfig} />
          <ConfigBlock title="Claude Code · .mcp.json" value={claudeConfig} />
        </div>
      </section>
    </div>
  );
}

function ConfigBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-medium uppercase text-gray-400 dark:text-gray-500">{title}</p>
        <CopyButton value={value} />
      </div>
      <pre className="min-h-36 overflow-x-auto rounded-xl bg-stone-100 p-4 text-xs leading-6 text-gray-700 dark:bg-neutral-950 dark:text-gray-300"><code>{value}</code></pre>
    </div>
  );
}
