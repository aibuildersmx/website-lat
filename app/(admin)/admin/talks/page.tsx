import type { ReactNode } from "react";
import {
  createVirtualTalk,
  deleteVirtualTalk,
  listVirtualTalksForAdmin,
  moveVirtualTalk,
  toggleVirtualTalkPublished,
  updateVirtualTalk,
} from "@/lib/actions/virtual-talks";

export const dynamic = "force-dynamic";

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  textarea = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
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
        <form action={createVirtualTalk} className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Field label="Titulo" name="title" placeholder="How I Use AI #8: ..." />
          <Field label="Luma URL" name="href" placeholder="https://luma.com/..." />
          <Field label="Meta" name="meta" placeholder="Virtual Talk · 09 Jul 2026" />
          <Field label="Descripcion" name="body" placeholder="Resumen corto para la pagina publica" />
          <div className="lg:col-span-2">
            <PillButton tone="dark">Crear charla</PillButton>
          </div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        {talks.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400 dark:text-gray-500">
            Aun no hay charlas. Agrega una con el formulario de arriba.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {talks.map((talk) => (
              <li key={talk.id} className="p-5">
                <form action={updateVirtualTalk} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <input type="hidden" name="id" value={talk.id} />
                  <Field label="Titulo" name="title" defaultValue={talk.title} />
                  <Field label="Luma URL" name="href" defaultValue={talk.href} />
                  <Field label="Meta" name="meta" defaultValue={talk.meta} />
                  <Field label="Descripcion" name="body" defaultValue={talk.body} textarea />
                  <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
                    <PillButton tone="dark">Guardar</PillButton>
                    <a
                      href={talk.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-black/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5"
                    >
                      Abrir Luma
                    </a>
                  </div>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={moveVirtualTalk}>
                    <input type="hidden" name="id" value={talk.id} />
                    <input type="hidden" name="direction" value="up" />
                    <PillButton>Subir</PillButton>
                  </form>
                  <form action={moveVirtualTalk}>
                    <input type="hidden" name="id" value={talk.id} />
                    <input type="hidden" name="direction" value="down" />
                    <PillButton>Bajar</PillButton>
                  </form>
                  <form action={toggleVirtualTalkPublished}>
                    <input type="hidden" name="id" value={talk.id} />
                    <input type="hidden" name="published" value={talk.published ? "false" : "true"} />
                    <PillButton>{talk.published ? "Ocultar" : "Publicar"}</PillButton>
                  </form>
                  <form action={deleteVirtualTalk}>
                    <input type="hidden" name="id" value={talk.id} />
                    <PillButton tone="danger">Eliminar</PillButton>
                  </form>
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      talk.published
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300"
                    }`}
                  >
                    {talk.published ? "Publicado" : "Oculto"} · Orden {talk.position}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
