"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { bulkImportSubscribers } from "@/lib/actions/newsletter";
import {
  initialBulkImportState,
  type BulkImportState,
} from "@/lib/newsletter/bulk-import";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-100 px-3 py-2 dark:bg-white/5">
      <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-100">
        {value.toLocaleString("es-MX")}
      </p>
    </div>
  );
}

function Result({ state }: { state: BulkImportState }) {
  if (!state.message) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        state.ok
          ? "border-green-500/20 bg-green-500/10 text-green-900 dark:text-green-100"
          : "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-100"
      }`}
    >
      <p className="font-medium">{state.message}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Unicos" value={state.uniqueCount} />
        <Stat label="Agregados" value={state.insertedCount} />
        <Stat label="Existentes" value={state.skippedCount} />
        <Stat label="Duplicados" value={state.duplicateInputCount} />
        <Stat label="Invalidos" value={state.invalidCount} />
      </div>
      {state.invalidSamples.length > 0 ? (
        <p className="mt-3 text-xs opacity-80">
          Invalidos: {state.invalidSamples.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function BulkSubscriberImport() {
  const [state, action, pending] = useActionState(
    bulkImportSubscribers,
    initialBulkImportState,
  );
  const [fileName, setFileName] = useState("");

  return (
    <form action={action} className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="grid gap-3">
        <textarea
          name="emails"
          rows={7}
          placeholder="email@dominio.com, otra@dominio.com&#10;tercera@dominio.com"
          className="min-h-44 resize-y rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-gray-900 dark:border-white/10 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/50"
        />
        <Result state={state} />
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-stone-50 px-4 py-5 text-center text-sm text-gray-500 transition hover:border-gray-400 hover:bg-stone-100 dark:border-white/15 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-white/30 dark:hover:bg-white/[0.06]">
          <Upload className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">{fileName || "CSV o TXT"}</span>
          <input
            name="file"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
            className="sr-only"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gray-900 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {pending ? "Importando..." : "Importar contactos"}
        </button>
        <p className="text-xs leading-5 text-gray-400 dark:text-gray-500">
          Solo crea contactos nuevos. Los correos existentes se saltan sin modificar sus datos.
        </p>
      </div>
    </form>
  );
}
