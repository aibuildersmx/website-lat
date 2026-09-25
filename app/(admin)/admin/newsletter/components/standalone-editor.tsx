"use client";

import { useEffect, useRef, useState } from "react";
import { ctaProblem, formToEmail } from "@/lib/newsletter/standalone-form";
import type { StandaloneEmail } from "@/lib/newsletter/standalone-types";
import {
  deleteDraftIssue,
  getIssueProgress,
  renderStandalonePreview,
  retryFailed,
  saveStandalone,
  sendIssue,
  sendStandaloneTest,
  startIssueWarmup,
  type IssueProgress,
} from "@/lib/actions/newsletter";

type SaveState = "idle" | "saving" | "saved" | "error";

const INPUT =
  "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-black/40 disabled:opacity-60 dark:border-white/15 dark:bg-neutral-900 dark:text-gray-100 dark:focus:border-white/40";
const LABEL = "mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400";

export function StandaloneEditor({
  id,
  initialData,
  status: initialStatus,
  initialProgress,
}: {
  id: string;
  initialData: StandaloneEmail;
  status: string;
  initialProgress: IssueProgress;
}) {
  const [base, setBase] = useState<StandaloneEmail>(initialData);
  const [subtitle, setSubtitle] = useState(initialData.subtitle ?? "");
  const [ctaText, setCtaText] = useState(initialData.cta?.text ?? "");
  const [ctaHref, setCtaHref] = useState(initialData.cta?.href ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState<IssueProgress>(initialProgress);
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [srcDoc, setSrcDoc] = useState("");
  const [busy, setBusy] = useState(false);
  const firstRender = useRef(true);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);

  const email = formToEmail({ base, subtitle, ctaText, ctaHref });
  const emailKey = JSON.stringify(email);
  const draft = status === "draft";
  const sending = status === "sending";
  const sent = status === "sent";
  const ctaWarning = ctaProblem(ctaText, ctaHref);

  // Upload, then drop the markdown line at the cursor as its own paragraph.
  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/newsletter/images", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { markdown?: string; error?: string };
      if (!res.ok || !json.markdown) {
        setMessage({ kind: "err", text: json.error ?? "No se pudo subir la imagen." });
        return;
      }
      const at = bodyRef.current?.selectionStart ?? base.body.length;
      const before = base.body.slice(0, at).replace(/\s*$/, "");
      const after = base.body.slice(at).replace(/^\s*/, "");
      patch({ body: [before, json.markdown, after].filter(Boolean).join("\n\n") });
    } finally {
      setUploading(false);
    }
  }

  // Debounced autosave (skip the first render), same rhythm as the Build Log.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!draft) return;
    const t = setTimeout(async () => {
      const res = await saveStandalone(id, JSON.parse(emailKey) as StandaloneEmail);
      setSaveState("error" in res ? "error" : "saved");
      setMessage((current) =>
        "error" in res ? { kind: "err", text: res.error } : current?.kind === "err" ? null : current,
      );
    }, 1000);
    return () => clearTimeout(t);
  }, [emailKey, id, draft]);

  // Live preview of the real email HTML.
  useEffect(() => {
    const t = setTimeout(async () => {
      setSrcDoc(await renderStandalonePreview(JSON.parse(emailKey) as StandaloneEmail));
    }, 300);
    return () => clearTimeout(t);
  }, [emailKey]);

  // Poll send progress while the queue drains.
  useEffect(() => {
    if (!sending) return;
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      const p = await getIssueProgress(id);
      if (!active) return;
      setProgress(p);
      if (p.issueStatus === "sent") {
        setStatus("sent");
        return;
      }
      timeout = setTimeout(tick, p.warmingUp ? 30_000 : 3_000);
    };
    void tick();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [sending, id]);

  function patch(next: Partial<StandaloneEmail>) {
    setSaveState("saving");
    setBase((current) => ({ ...current, ...next }));
  }

  function onField(setter: (value: string) => void) {
    return (value: string) => {
      setSaveState("saving");
      setter(value);
    };
  }

  // Sends always go out from the saved row, so flush the latest edits first.
  async function saveNow(): Promise<boolean> {
    const res = await saveStandalone(id, email);
    if ("error" in res) {
      setSaveState("error");
      setMessage({ kind: "err", text: res.error });
      return false;
    }
    setSaveState("saved");
    return true;
  }

  async function onSendTest() {
    setMessage(null);
    const res = await sendStandaloneTest(email, testEmail);
    setMessage("error" in res ? { kind: "err", text: res.error } : { kind: "ok", text: res.message ?? "Prueba enviada." });
  }

  async function onStartWarmup() {
    if (!window.confirm("¿Iniciar el envío por tandas? Se enviarán hasta 1,200 correos durante las primeras 24 horas y el resto al día siguiente, en grupos de 100 cada 30 minutos.")) return;
    setBusy(true);
    setMessage(null);
    if (!(await saveNow())) return setBusy(false);
    const res = await startIssueWarmup(id);
    setBusy(false);
    if ("error" in res) return setMessage({ kind: "err", text: res.error });
    setStatus("sending");
    setProgress((current) => ({ ...current, issueStatus: "sending", warmingUp: true }));
    setMessage({ kind: "ok", text: res.message ?? "Envío por tandas iniciado." });
  }

  async function onSendAll() {
    if (!window.confirm("¿Enviar este email a TODOS los contactos suscritos? No se puede deshacer.")) return;
    setBusy(true);
    setMessage(null);
    if (!(await saveNow())) return setBusy(false);
    const res = await sendIssue(id);
    setBusy(false);
    if ("error" in res) return setMessage({ kind: "err", text: res.error });
    setStatus("sending");
    setMessage({ kind: "ok", text: res.message ?? "Email encolado." });
  }

  async function onRetryFailed() {
    setMessage(null);
    const res = await retryFailed(id);
    if ("error" in res) return setMessage({ kind: "err", text: res.error });
    setStatus("sending");
    setMessage({ kind: "ok", text: res.message ?? "Reintentando." });
  }

  async function onDownloadHtml() {
    const html = await renderStandalonePreview(email);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `email-${email.slug}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function onDeleteDraft() {
    if (!window.confirm("¿Eliminar este borrador? Esta acción no se puede deshacer.")) return;
    const formData = new FormData();
    formData.set("id", id);
    await deleteDraftIssue(formData);
    window.location.href = "/admin/newsletter";
  }

  const saveText =
    saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado" : saveState === "error" ? "Error al guardar" : "";

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 -mt-10 mb-8 border-b border-black/5 bg-stone-100/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-12 sm:px-6 dark:border-white/10 dark:bg-neutral-950/95">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-xl font-medium text-gray-800 dark:text-gray-100">Email suelto</span>
            <span
              className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${
                sent
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : sending
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${sent ? "bg-green-500" : sending ? "bg-amber-500" : "bg-black/20 dark:bg-white/30"}`} />
              {sent ? "Enviado" : sending ? "Enviando…" : "Borrador"}
            </span>
            {saveText && <span className="shrink-0 text-sm font-medium text-gray-400 dark:text-gray-500">{saveText}</span>}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {draft && (
              <button
                type="button"
                onClick={onDeleteDraft}
                className="px-2 py-2 text-xs font-medium text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Eliminar borrador
              </button>
            )}
            <button
              type="button"
              onClick={onStartWarmup}
              disabled={!draft || busy}
              className="h-10 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {sent ? "Enviado" : sending ? "Enviando…" : busy ? "Iniciando…" : "Enviar por tandas"}
            </button>
            <button
              type="button"
              onClick={onSendAll}
              disabled={!draft || busy}
              className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:border-black/30 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-neutral-900 dark:text-gray-300 dark:hover:border-white/40 dark:hover:text-white"
            >
              Enviar todo ahora
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-black/5 pt-4 dark:border-white/10">
          <button
            type="button"
            onClick={() => void onDownloadHtml()}
            className="h-9 rounded-lg border border-black/10 px-3 text-xs font-medium text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5"
          >
            Descargar HTML
          </button>
          <div className="flex h-9 overflow-hidden rounded-lg border border-black/10 bg-white focus-within:border-black/40 dark:border-white/15 dark:bg-neutral-900 dark:focus-within:border-white/40">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-44 bg-transparent px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={onSendTest}
              className="border-l border-black/10 px-3 text-xs font-semibold text-gray-600 transition hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Enviar prueba
            </button>
          </div>
          {sending && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {progress.sent}/{progress.total} enviados
              {progress.failed > 0 && ` · ${progress.failed} fallaron`}
            </span>
          )}
          {sent && progress.failed > 0 && (
            <button
              type="button"
              onClick={onRetryFailed}
              className="h-9 rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-600 transition hover:border-red-500/60 hover:bg-red-500/5"
            >
              Reintentar {progress.failed} fallidos
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`mx-auto mb-6 max-w-[1200px] rounded-xl border px-4 py-3 text-sm ${
            message.kind === "ok"
              ? "border-green-500/20 bg-green-500/5 text-green-700"
              : "border-red-500/20 bg-red-500/5 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mx-auto grid max-w-[1200px] items-start gap-6 xl:grid-cols-2">
        <fieldset disabled={!draft} className="space-y-5 rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-neutral-900">
          <div>
            <label className={LABEL} htmlFor="standalone-subject">Asunto</label>
            <input id="standalone-subject" className={INPUT} value={base.subject} onChange={(e) => patch({ subject: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="standalone-preview">Texto de preview (inbox)</label>
            <input id="standalone-preview" className={INPUT} value={base.preview} onChange={(e) => patch({ preview: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="standalone-title">Título</label>
            <input id="standalone-title" className={INPUT} value={base.title} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div>
            <label className={LABEL} htmlFor="standalone-subtitle">Subtítulo (opcional)</label>
            <input id="standalone-subtitle" className={INPUT} value={subtitle} onChange={(e) => onField(setSubtitle)(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={LABEL} htmlFor="standalone-body">Cuerpo</label>
              {draft && (
                <label className="mb-1.5 cursor-pointer text-xs font-medium text-gray-500 underline-offset-2 hover:underline dark:text-gray-400">
                  {uploading ? "Subiendo…" : "Subir imagen"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic" className="hidden" disabled={uploading} onChange={uploadImage} />
                </label>
              )}
            </div>
            <textarea
              ref={bodyRef}
              id="standalone-body"
              rows={16}
              className={`${INPUT} h-auto py-2.5 font-mono leading-relaxed`}
              value={base.body}
              onChange={(e) => patch({ body: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Markdown: **negritas**, *itálicas*, [link](https://…), ## encabezado, - lista. Línea en blanco = párrafo nuevo.
              Las imágenes van solas en su párrafo; cambia el texto entre [ ] por una descripción.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="standalone-cta-text">Botón: texto (opcional)</label>
              <input id="standalone-cta-text" className={INPUT} value={ctaText} onChange={(e) => onField(setCtaText)(e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="standalone-cta-href">Botón: URL</label>
              <input
                id="standalone-cta-href"
                className={INPUT}
                value={ctaHref}
                placeholder="https://"
                onChange={(e) => onField(setCtaHref)(e.target.value)}
              />
            </div>
            {ctaWarning && (
              <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-300">
                {ctaWarning} Mientras tanto el email se guarda sin botón.
              </p>
            )}
          </div>
        </fieldset>

        <iframe
          title="Vista previa del email"
          srcDoc={srcDoc}
          className="h-[80vh] w-full rounded-2xl border border-black/5 bg-white dark:border-white/10"
        />
      </div>
    </div>
  );
}
