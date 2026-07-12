"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Issue } from "@/lib/newsletter/types";
import type { BaseIssue } from "@/lib/newsletter/types";
import {
  createIssueDraft,
  deleteDraftIssue,
  saveIssue,
  sendTest,
  sendIssue,
  renderPreview,
  retryFailed,
  getIssueProgress,
  type IssueProgress,
  type IssueEngagement,
  translateIssueToSpanish,
} from "@/lib/actions/newsletter";
import { EditableCanvas } from "./editable-canvas";
import { EngagementPanel } from "./engagement-panel";
import { originalIssue } from "@/lib/newsletter/translation";

type SaveState = "idle" | "saving" | "saved" | "error";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function formatIssueDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || !MONTHS[month - 1]) return "";
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
}

function dateInputValue(value: string): string {
  const match = value.trim().toUpperCase().match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (!match) return "";
  const month = MONTHS.indexOf(match[2]) + 1;
  if (!month) return "";
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

export function IssueEditor({
  id,
  initialData,
  status: initialStatus,
  initialProgress,
  engagement,
  onIssueCreated,
}: {
  id: string | null;
  initialData: Issue;
  status: string;
  initialProgress: IssueProgress;
  engagement?: IssueEngagement | null;
  onIssueCreated?: (id: string) => void;
}) {
  const [issueId, setIssueId] = useState(id);
  const [issue, setIssue] = useState<Issue>(initialData);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState<IssueProgress>(initialProgress);
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [srcDoc, setSrcDoc] = useState("");
  const [editorLanguage, setEditorLanguage] = useState<"original" | "es">(
    initialData.spanish ? "es" : "original",
  );
  const [translating, setTranslating] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [isPending, startTransition] = useTransition();

  const firstRender = useRef(true);
  const createPromise = useRef<Promise<string> | null>(null);
  const latestIssue = useRef(issue);
  const sent = status === "sent";
  const sending = status === "sending";
  const draft = status === "draft";

  useEffect(() => {
    latestIssue.current = issue;
  }, [issue]);

  const ensureIssueId = useCallback(async (data: Issue): Promise<string> => {
    if (issueId) return issueId;
    createPromise.current ??= createIssueDraft(data);
    const createdId = await createPromise.current;
    setIssueId(createdId);
    onIssueCreated?.(createdId);
    return createdId;
  }, [issueId, onIssueCreated]);

  // Debounced autosave whenever the issue changes (skip the first render).
  // "saving" is flagged in onChange (an event) — not synchronously in the
  // effect — so the indicator is instant without cascading renders.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(async () => {
      const idToSave = await ensureIssueId(issue);
      const res = await saveIssue(idToSave, issue);
      setSaveState("error" in res ? "error" : "saved");
    }, 1000);
    return () => clearTimeout(t);
  }, [issue, ensureIssueId]);

  // Poll send progress while the issue is draining the queue. Stops when no
  // recipients remain pending (the worker has finalized the issue to "sent").
  useEffect(() => {
    if (!sending) return;
    if (!issueId) return;
    let active = true;
    const tick = async () => {
      const p = await getIssueProgress(issueId);
      if (!active) return;
      setProgress(p);
      if (p.pending === 0 && p.total > 0) setStatus("sent");
    };
    void tick();
    const interval = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sending, issueId]);

  function onIssueChange(next: Issue) {
    setSaveState("saving");
    setIssue({
      ...next,
      spanishTranslationStale: next.spanish ? true : next.spanishTranslationStale,
    });
  }

  function onCanvasChange(next: BaseIssue) {
    setSaveState("saving");
    if (editorLanguage === "es") {
      setIssue({ ...issue, spanish: next });
      return;
    }
    setIssue({
      ...next,
      spanish: issue.spanish,
      spanishTranslationStale: issue.spanish ? true : undefined,
    });
  }

  async function translateToSpanish() {
    const sourceSnapshot = latestIssue.current;
    setTranslating(true);
    setMessage(null);
    const idToTranslate = await ensureIssueId(sourceSnapshot);
    const saved = await saveIssue(idToTranslate, sourceSnapshot);
    if ("error" in saved) {
      setTranslating(false);
      setSaveState("error");
      setMessage({ kind: "err", text: saved.error });
      return;
    }
    const result = await translateIssueToSpanish(idToTranslate);
    setTranslating(false);
    if ("error" in result) {
      setMessage({ kind: "err", text: result.error });
      return;
    }
    setSaveState("saving");
    const current = latestIssue.current;
    const sourceChanged =
      JSON.stringify(originalIssue(current)) !==
      JSON.stringify(originalIssue(sourceSnapshot));
    setIssue({
      ...current,
      spanish: result.translation,
      spanishTranslationStale: sourceChanged,
    });
    setEditorLanguage("es");
    setMessage({
      kind: sourceChanged ? "err" : "ok",
      text: sourceChanged
        ? "El original cambió durante la traducción. Revisa y vuelve a actualizar el español."
        : "Traducción al español guardada en el borrador.",
    });
  }

  function selectSpanish() {
    if (issue.spanish) {
      setEditorLanguage("es");
      return;
    }
    void translateToSpanish();
  }

  function onDateChange(value: string) {
    onIssueChange({
      ...issue,
      date: formatIssueDate(value),
    });
  }

  function onIssueNumberChange(value: string) {
    const number = value.replace(/\D/g, "");
    onIssueChange({ ...issue, issueLabel: number ? `Issue ${number}` : "" });
  }

  function onReadingTimeChange(value: string) {
    const minutes = value.replace(/\D/g, "");
    onIssueChange({
      ...issue,
      readingTime: minutes ? `${minutes} min de lectura` : "",
    });
  }

  // Render the real email only while the modal is open (debounced on edits).
  useEffect(() => {
    if (!showEmail) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        setSrcDoc(await renderPreview(issue));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [showEmail, issue]);

  async function onSendTest() {
    setMessage(null);
    const res = await sendTest(issue, testEmail);
    setMessage(
      "error" in res
        ? { kind: "err", text: res.error }
        : { kind: "ok", text: res.message ?? "Prueba enviada." },
    );
  }

  async function onDownloadHtml() {
    setDownloadingHtml(true);
    setMessage(null);
    try {
      const html = await renderPreview(issue);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `the-build-log-${issue.slug}-es.html`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ kind: "err", text: "No se pudo descargar el HTML." });
    } finally {
      setDownloadingHtml(false);
    }
  }

  async function onSendIssue() {
    if (!window.confirm("¿Enviar este issue a TODOS los contactos suscritos? No se puede deshacer.")) return;
    setMessage(null);
    const idToSend = await ensureIssueId(issue);
    const saved = await saveIssue(idToSend, issue);
    if ("error" in saved) {
      setSaveState("error");
      setMessage({ kind: "err", text: saved.error });
      return;
    }
    setSaveState("saved");
    const res = await sendIssue(idToSend);
    if ("error" in res) {
      setMessage({ kind: "err", text: res.error });
    } else {
      setStatus("sending");
      setMessage({ kind: "ok", text: res.message ?? "Newsletter encolado." });
    }
  }

  async function onRetryFailed() {
    setMessage(null);
    if (!issueId) return;
    const res = await retryFailed(issueId);
    if ("error" in res) {
      setMessage({ kind: "err", text: res.error });
    } else {
      setStatus("sending");
      setMessage({ kind: "ok", text: res.message ?? "Reintentando." });
    }
  }

  async function onDeleteDraft() {
    if (!issueId || !draft) return;
    if (!window.confirm("¿Eliminar este borrador? Esta acción no se puede deshacer.")) return;

    const formData = new FormData();
    formData.set("id", issueId);
    await deleteDraftIssue(formData);
    window.location.href = "/admin/newsletter";
  }

  const saveText =
    saveState === "saving"
      ? "Guardando…"
      : saveState === "saved"
        ? "Guardado"
        : saveState === "error"
          ? "Error al guardar"
          : "";

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 -mt-10 mb-8 border-b border-black/5 bg-stone-100/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-12 sm:px-6 dark:border-white/10 dark:bg-neutral-950/95">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-xl font-medium text-gray-800 dark:text-gray-100">
              Issue {issue.slug}
            </span>
            <span
              className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${
                sent
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : sending
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  sent ? "bg-green-500" : sending ? "bg-amber-500" : "bg-black/20 dark:bg-white/30"
                }`}
              />
              {sent ? "Enviado" : sending ? "Enviando…" : "Borrador"}
            </span>
            {saveText && (
              <span className="shrink-0 text-sm font-medium text-gray-400 dark:text-gray-500">
                {saveText}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {draft && issueId && (
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
              onClick={onSendIssue}
              disabled={sent || sending}
              className="h-10 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {sent ? "Enviado" : sending ? "Enviando…" : "Enviar newsletter"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center rounded-lg border border-black/10 bg-white p-1 dark:border-white/15 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setEditorLanguage("original")}
              className={`h-7 rounded-md px-3 font-mono text-[10px] font-bold uppercase transition ${
                editorLanguage === "original"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Original
            </button>
            <button
              type="button"
              onClick={selectSpanish}
              disabled={translating}
              className={`h-7 rounded-md px-3 font-mono text-[10px] font-bold uppercase transition disabled:opacity-50 ${
                editorLanguage === "es"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {translating ? "Traduciendo…" : "Español"}
            </button>
          </div>
          {issue.spanish && (
            <button
              type="button"
              onClick={() => void translateToSpanish()}
              disabled={translating}
              className="h-9 rounded-lg border border-black/10 px-3 font-mono text-[10px] font-bold uppercase text-gray-500 transition hover:border-black/30 hover:text-gray-800 disabled:opacity-50 dark:border-white/15 dark:text-gray-400 dark:hover:border-white/40 dark:hover:text-gray-200"
            >
              {issue.spanishTranslationStale ? "Actualizar español" : "Retraducir"}
            </button>
          )}
          {editorLanguage === "es" && issue.spanishTranslationStale && (
            <button
              type="button"
              onClick={() => {
                setSaveState("saving");
                setIssue({ ...issue, spanishTranslationStale: false });
              }}
              className="h-9 rounded-lg border border-amber-500/30 px-3 font-mono text-[10px] font-bold uppercase text-amber-700 transition hover:bg-amber-500/5 dark:text-amber-300"
            >
              Usar español editado
            </button>
          )}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="h-9 rounded-lg border border-black/10 px-3 text-xs font-medium text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5"
          >
            Ver email real
          </button>
          <button
            type="button"
            onClick={() => void onDownloadHtml()}
            disabled={downloadingHtml}
            className="h-9 rounded-lg border border-black/10 px-3 text-xs font-medium text-gray-600 transition hover:border-black/30 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5"
          >
            {downloadingHtml ? "Preparando…" : "Descargar HTML"}
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
            <span className="font-sans text-xs font-medium text-gray-500 dark:text-gray-400">
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
      </div>

      {message && (
        <div
          className={`mx-auto mb-6 max-w-[680px] rounded-xl border px-4 py-3 text-sm ${
            message.kind === "ok"
              ? "border-green-500/20 bg-green-500/5 text-green-700"
              : "border-red-500/20 bg-red-500/5 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {sent && engagement && <EngagementPanel data={engagement} />}

      <div className="mx-auto grid max-w-[960px] items-start gap-6 xl:grid-cols-[minmax(0,680px)_256px]">
        <div>
          {editorLanguage === "es" && issue.spanishTranslationStale && (
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              La versión original cambió. Actualiza la traducción antes de enviar.
            </div>
          )}
          <EditableCanvas
            issue={editorLanguage === "es" && issue.spanish ? issue.spanish : issue}
            onChange={onCanvasChange}
          />
        </div>

        <aside className="rounded-2xl border border-black/5 bg-white p-5 xl:sticky xl:top-24 dark:border-white/10 dark:bg-neutral-900">
          <p className="font-mono text-[11px] font-semibold uppercase text-gray-400 dark:text-gray-500">
            Datos del issue
          </p>
          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="issue-number"
                className="text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Número
              </label>
              <div className="mt-1.5 flex h-10 items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-black/40 dark:border-white/15 dark:bg-neutral-950 dark:focus-within:border-white/40">
                <span className="mr-2 font-mono text-sm text-gray-400">Issue</span>
                <input
                  id="issue-number"
                  type="text"
                  inputMode="numeric"
                  value={issue.issueLabel.replace(/\D/g, "")}
                  onChange={(event) => onIssueNumberChange(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm text-gray-700 outline-none dark:text-gray-200"
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                Sugerido a partir de los issues existentes.
              </p>
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                Mostrar número en el email
                <input
                  type="checkbox"
                  checked={issue.showIssueLabel !== false}
                  onChange={(event) =>
                    onIssueChange({ ...issue, showIssueLabel: event.target.checked })
                  }
                  className="h-4 w-4 accent-gray-900 dark:accent-white"
                />
              </label>
            </div>

            <div>
              <label
                htmlFor="issue-date"
                className="text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Fecha
              </label>
              <input
                id="issue-date"
                type="date"
                value={dateInputValue(issue.date)}
                onChange={(event) => onDateChange(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-black/40 dark:border-white/15 dark:bg-neutral-950 dark:text-gray-200 dark:focus:border-white/40"
              />
            </div>

            <div>
              <label
                htmlFor="reading-time"
                className="text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Minutos de lectura
              </label>
              <div className="mt-1.5 flex h-10 items-center rounded-xl border border-black/10 bg-white px-3 focus-within:border-black/40 dark:border-white/15 dark:bg-neutral-950 dark:focus-within:border-white/40">
                <input
                  id="reading-time"
                  type="text"
                  inputMode="numeric"
                  value={issue.readingTime.replace(/\D/g, "")}
                  onChange={(event) => onReadingTimeChange(event.target.value)}
                  className="w-10 bg-transparent font-mono text-sm text-gray-700 outline-none dark:text-gray-200"
                />
                <span className="font-mono text-xs uppercase text-gray-400">
                  min de lectura
                </span>
              </div>
            </div>

            <div className="border-t border-black/5 pt-4 font-mono text-[11px] uppercase leading-relaxed text-gray-400 dark:border-white/10 dark:text-gray-500">
              {[
                issue.showIssueLabel !== false && issue.issueLabel.trim()
                  ? issue.issueLabel
                  : null,
                issue.date || "Fecha pendiente",
                issue.readingTime,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </aside>
      </div>

      {/* Real-email modal: the exact send-time render */}
      {showEmail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowEmail(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="text-xs font-medium text-white/40">
                Email real {isPending && "· actualizando…"}
              </span>
              <button
                type="button"
                onClick={() => setShowEmail(false)}
                className="font-mono text-xs font-bold uppercase tracking-normal text-white/40 transition hover:text-white"
              >
                Cerrar ×
              </button>
            </div>
            <iframe
              title="Email real"
              srcDoc={srcDoc}
              className="w-full flex-1 bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
