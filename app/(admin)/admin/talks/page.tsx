import type { ReactNode } from "react";
import {
  createVirtualTalk,
  deleteVirtualTalk,
  listVirtualTalksForAdmin,
  toggleVirtualTalkPublished,
  updateVirtualTalk,
} from "@/lib/actions/virtual-talks";

export const dynamic = "force-dynamic";

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  textarea = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  const className =
    "mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-gray-900 dark:border-white/10 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/50";

  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-normal text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={3}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  );
}

function PillButton({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "dark" | "danger";
}) {
  const className =
    tone === "dark"
      ? "rounded-full bg-gray-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      : tone === "danger"
        ? "rounded-full border border-red-500/30 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-normal text-red-600 transition hover:border-red-500/60 hover:bg-red-500/5"
        : "rounded-full border border-black/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5";

  return (
    <button type="submit" className={className}>
      {children}
    </button>
  );
}

export default async function TalksAdminPage() {
  const talks = await listVirtualTalksForAdmin();

  return (
    <div>
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">HowIUseAI</p>
        <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">
          Charlas virtuales
        </h1>
      </div>

      <section className="mt-8 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">Nueva charla</h2>
        <form
          action={createVirtualTalk}
          className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_11rem_auto] lg:items-end"
        >
          <Field label="Titulo" name="title" placeholder="How I Use AI #8: ..." />
          <Field label="URL" name="href" placeholder="https://luma.com/..." />
          <Field label="Fecha" name="eventDate" type="date" />
          <PillButton tone="dark">Crear charla</PillButton>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        {talks.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400 dark:text-gray-500">
            Aún no hay charlas. Agrega una con el formulario de arriba.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {talks.map((talk) => (
              <li key={talk.id} className="p-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_11rem_auto] xl:items-end">
                  <form action={updateVirtualTalk} className="contents">
                    <input type="hidden" name="id" value={talk.id} />
                    <Field label="Titulo" name="title" defaultValue={talk.title} />
                    <Field label="URL" name="href" defaultValue={talk.href} />
                    <Field
                      label="Fecha"
                      name="eventDate"
                      type="date"
                      defaultValue={talk.eventDate}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <PillButton tone="dark">Guardar</PillButton>
                      <a
                        href={talk.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-black/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5"
                      >
                        Abrir URL
                      </a>
                    </div>
                  </form>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      talk.published
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300"
                    }`}
                  >
                    {talk.published ? "Publicado" : "Oculto"}
                  </span>
                  <form action={toggleVirtualTalkPublished}>
                    <input type="hidden" name="id" value={talk.id} />
                    <input type="hidden" name="published" value={talk.published ? "false" : "true"} />
                    <PillButton>{talk.published ? "Ocultar" : "Publicar"}</PillButton>
                  </form>
                  <form action={deleteVirtualTalk}>
                    <input type="hidden" name="id" value={talk.id} />
                    <PillButton tone="danger">Eliminar</PillButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
