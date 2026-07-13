"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { ArticleRow } from "@/lib/db/schema";
import { normalizeArticleContent, slugifyArticle, type ArticleSection } from "@/lib/blog/article-types";
import { ARTICLE_PREVIEW_MESSAGE, type ArticlePreviewPayload } from "@/lib/blog/article-preview";
import { deleteArticle, saveArticle, type ArticleActionState } from "@/lib/actions/articles";

const initialActionState: ArticleActionState = { ok: false, message: "" };
const fieldClass = "mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-gray-900 dark:border-white/10 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/50";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-medium uppercase text-gray-400 dark:text-gray-500">{children}</span>;
}

export function ArticleEditor({ article }: { article: ArticleRow }) {
  const [actionState, action, pending] = useActionState(saveArticle, initialActionState);
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [description, setDescription] = useState(article.description);
  const [author, setAuthor] = useState(article.author);
  const [publishedOn, setPublishedOn] = useState(article.publishedOn);
  const [readTime, setReadTime] = useState(article.readTime);
  const [tags, setTags] = useState(article.tags.join(", "));
  const [sections, setSections] = useState<ArticleSection[]>(normalizeArticleContent(article.content).sections);
  const [view, setView] = useState<"composer" | "preview">("composer");
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const contentJson = useMemo(() => JSON.stringify({ sections }), [sections]);
  const previewContent = useMemo(() => normalizeArticleContent({ sections }), [sections]);
  const previewPayload = useMemo<ArticlePreviewPayload>(() => ({
    title,
    description,
    author,
    publishedOn,
    readTime,
    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    content: previewContent,
  }), [author, description, previewContent, publishedOn, readTime, tags, title]);

  const sendPreview = useCallback(() => {
    previewFrameRef.current?.contentWindow?.postMessage(
      { type: ARTICLE_PREVIEW_MESSAGE, payload: previewPayload },
      window.location.origin,
    );
  }, [previewPayload]);

  useEffect(() => {
    if (view !== "preview") return;
    sendPreview();
  }, [sendPreview, view]);

  useEffect(() => {
    function receivePreviewReady(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== previewFrameRef.current?.contentWindow) return;
      if (event.data?.type === `${ARTICLE_PREVIEW_MESSAGE}-ready`) sendPreview();
    }
    window.addEventListener("message", receivePreviewReady);
    return () => window.removeEventListener("message", receivePreviewReady);
  }, [sendPreview]);

  function updateSection(index: number, patch: Partial<ArticleSection>) {
    setSections((current) => current.map((section, i) => i === index ? { ...section, ...patch } : section));
  }

  function addSection() {
    setSections((current) => [...current, { id: `seccion-${current.length + 1}`, heading: "", body: "" }]);
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 -mt-10 mb-8 border-b border-black/5 bg-stone-100/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-12 sm:px-6 dark:border-white/10 dark:bg-neutral-950/95">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin/articles" className="shrink-0 text-sm text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200">←</Link>
            <span className="max-w-xl truncate text-xl font-medium text-gray-800 dark:text-gray-100">
              {title || "Nuevo artículo"}
            </span>
            <span className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${article.status === "published" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${article.status === "published" ? "bg-green-500" : "bg-black/20 dark:bg-white/30"}`} />
              {article.status === "published" ? "Publicado" : "Borrador"}
            </span>
            {actionState.message ? <span className={`hidden shrink-0 text-sm font-medium sm:inline ${actionState.ok ? "text-green-600" : "text-red-600"}`}>{actionState.message}</span> : null}
          </div>

          <div className="flex items-center gap-3">
            {article.id !== "new" ? (
              <button type="submit" form="delete-article-form" className="px-2 py-2 text-xs font-medium text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                {article.status === "published" ? "Eliminar artículo" : "Eliminar borrador"}
              </button>
            ) : null}
            <button type="submit" form="article-editor-form" name="intent" value={article.status === "published" ? "unpublish" : "publish"} disabled={pending} className="h-10 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200">
              {pending ? "Guardando…" : article.status === "published" ? "Guardar como borrador" : "Guardar y publicar"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
          <div className="inline-flex h-9 w-fit items-center rounded-lg border border-black/10 bg-white p-1 dark:border-white/15 dark:bg-neutral-900">
            <button type="button" onClick={() => setView("composer")} className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] font-bold uppercase transition ${view === "composer" ? "bg-gray-900 text-white dark:bg-white dark:text-black" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}>
              <Pencil className="h-3.5 w-3.5" /> Composer
            </button>
            <button type="button" onClick={() => setView("preview")} className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] font-bold uppercase transition ${view === "preview" ? "bg-gray-900 text-white dark:bg-white dark:text-black" : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}>
              <Eye className="h-3.5 w-3.5" /> Vista previa
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {article.status === "published" ? (
              <a href={`/blog/${article.slug}`} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-medium text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5">
                Ver artículo <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <button type="submit" form="article-editor-form" name="intent" value="save" disabled={pending} className="h-9 rounded-lg border border-black/10 px-3 text-xs font-medium text-gray-600 transition hover:border-black/30 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5">
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>

      <form id="article-editor-form" action={action}>
        <input type="hidden" name="id" value={article.id} />
        <input type="hidden" name="content" value={contentJson} />

        <div className={view === "composer" ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" : "hidden"}>
        <div className="space-y-6">
          <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900 sm:p-6">
            <div className="grid gap-4">
              <label>
                <FieldLabel>Título</FieldLabel>
                <input name="title" value={title} onChange={(event) => {
                  const next = event.target.value;
                  setTitle(next);
                  if (!article.title || slug === slugifyArticle(title)) setSlug(slugifyArticle(next));
                }} className={`${fieldClass} text-lg font-medium`} placeholder="Título del ensayo" required />
              </label>
              <label>
                <FieldLabel>Descripción y resumen SEO</FieldLabel>
                <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={`${fieldClass} resize-y`} placeholder="Una idea clara que invite a leer el artículo." required />
              </label>
            </div>
          </section>

          <div className="space-y-4">
            {sections.map((section, index) => (
              <section key={index} className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900 sm:p-6">
                <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600">
                  <GripVertical className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase">Sección {index + 1}</span>
                  <button type="button" onClick={() => setSections((current) => current.filter((_, i) => i !== index))} className="ml-auto rounded-lg p-2 text-gray-400 transition hover:bg-red-500/5 hover:text-red-600" aria-label={`Eliminar sección ${index + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input value={section.heading} onChange={(event) => updateSection(index, { heading: event.target.value, id: slugifyArticle(event.target.value) || `seccion-${index + 1}` })} className="mt-3 w-full border-0 bg-transparent text-2xl font-medium text-gray-800 outline-none placeholder:text-gray-300 dark:text-gray-100 dark:placeholder:text-gray-700" placeholder={index === 0 ? "Introducción (opcional)" : "Título de la sección"} />
                <textarea value={section.body} onChange={(event) => updateSection(index, { body: event.target.value })} rows={10} className="mt-3 w-full resize-y border-0 bg-transparent text-base leading-7 text-gray-600 outline-none placeholder:text-gray-300 dark:text-gray-300 dark:placeholder:text-gray-700" placeholder="Escribe el contenido. Separa párrafos con una línea vacía. Usa - para listas y > para citas." />
              </section>
            ))}
          </div>

          <button type="button" onClick={addSection} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 py-4 text-sm text-gray-500 transition hover:border-black/30 hover:bg-black/[0.02] dark:border-white/20 dark:text-gray-400 dark:hover:bg-white/[0.03]">
            <Plus className="h-4 w-4" /> Agregar sección
          </button>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
            <h2 className="font-medium text-gray-800 dark:text-gray-100">Publicación</h2>
            <div className="mt-4 grid gap-4">
              <label><FieldLabel>Slug</FieldLabel><input name="slug" value={slug} onChange={(event) => setSlug(slugifyArticle(event.target.value))} className={fieldClass} required /></label>
              <label><FieldLabel>Autor</FieldLabel><select name="author" value={author} onChange={(event) => setAuthor(event.target.value)} className={fieldClass}><option>Ben Kim</option><option>Ricardo Garcia</option><option>Javier Rivero</option></select></label>
              <div className="grid grid-cols-2 gap-3">
                <label><FieldLabel>Fecha</FieldLabel><input type="date" name="publishedOn" value={publishedOn} onChange={(event) => setPublishedOn(event.target.value)} className={fieldClass} required /></label>
                <label><FieldLabel>Lectura</FieldLabel><input name="readTime" value={readTime} onChange={(event) => setReadTime(event.target.value)} className={fieldClass} placeholder="6 min" /></label>
              </div>
              <label><FieldLabel>Tags, separados por coma</FieldLabel><input name="tags" value={tags} onChange={(event) => setTags(event.target.value)} className={fieldClass} placeholder="openai, estrategia" /></label>
            </div>
          </section>

        </aside>
        </div>

        {view === "preview" ? (
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm dark:border-white/10">
            <iframe
              ref={previewFrameRef}
              src="/admin/article-preview"
              title="Vista previa del artículo en AI Builders Latam"
              onLoad={sendPreview}
              className="h-[calc(100vh-11rem)] min-h-[720px] w-full bg-white"
            />
          </div>
        ) : null}
      </form>

      {article.id !== "new" ? (
        <form id="delete-article-form" action={deleteArticle} className="hidden" onSubmit={(event) => { if (!window.confirm("¿Eliminar este artículo? Esta acción no se puede deshacer.")) event.preventDefault(); }}>
          <input type="hidden" name="id" value={article.id} />
        </form>
      ) : null}
    </div>
  );
}
