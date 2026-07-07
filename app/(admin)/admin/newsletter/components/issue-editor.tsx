"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Issue } from "@/lib/newsletter/types";
import {
  createIssueDraft,
  saveIssue,
  sendTest,
  sendIssue,
  renderPreview,
  retryFailed,
  getIssueProgress,
  type IssueProgress,
  type IssueEngagement,
} from "@/lib/actions/newsletter";
import { EditableCanvas } from "./editable-canvas";
import { EngagementPanel } from "./engagement-panel";

type SaveState = "idle" | "saving" | "saved" | "error";

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
  const [isPending, startTransition] = useTransition();

  const firstRender = useRef(true);
  const createPromise = useRef<Promise<string> | null>(null);
  const sent = status === "sent";
  const sending = status === "sending";

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
    setIssue(next);
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

  async function onSendIssue() {
    if (!window.confirm("¿Enviar este issue a TODOS los contactos suscritos? No se puede deshacer.")) return;
    setMessage(null);
    const idToSend = await ensureIssueId(issue);
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
      <div className="sticky top-0 z-10 -mx-4 -mt-10 mb-8 flex flex-wrap items-center gap-4 border-b border-black/5 bg-stone-100/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-12 sm:px-6 dark:border-white/10 dark:bg-neutral-950/95">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-xl font-medium text-gray-800 dark:text-gray-100">
            Issue {issue.slug}
          </span>
          <span
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
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

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="h-10 rounded-full border border-black/10 px-4 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5"
          >
            Ver email real
          </button>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="h-10 w-48 rounded-full border border-black/10 bg-white px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-black/40 dark:border-white/15 dark:bg-neutral-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-white/40"
          />
          <button
            type="button"
            onClick={onSendTest}
            className="h-10 rounded-full border border-black/10 px-4 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-600 transition hover:border-black/30 hover:bg-black/5 dark:border-white/15 dark:text-gray-300 dark:hover:border-white/40 dark:hover:bg-white/5"
          >
            Enviar prueba
          </button>
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
              className="h-10 rounded-full border border-red-500/30 px-4 font-mono text-[11px] font-bold uppercase tracking-normal text-red-600 transition hover:border-red-500/60 hover:bg-red-500/5"
            >
              Reintentar {progress.failed} fallidos
            </button>
          )}
          <button
            type="button"
            onClick={onSendIssue}
            disabled={sent || sending}
            className="h-10 rounded-full bg-gray-900 px-5 font-mono text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {sent ? "Enviado" : sending ? "Enviando…" : "Enviar newsletter"}
          </button>
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

      <EditableCanvas issue={issue} onChange={onIssueChange} />

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
