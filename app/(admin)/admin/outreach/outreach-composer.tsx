"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Eye, Languages, Send, TriangleAlert } from "lucide-react";
import { sendOutreachEmail, translateOutreachEmail } from "@/lib/actions/outreach";
import { parseBulkSubscriberEmails } from "@/lib/newsletter/bulk-import";
import {
  DEFAULT_OUTREACH_BODY,
  DEFAULT_OUTREACH_SUBJECT,
  MAX_OUTREACH_BODY_CHARS,
  MAX_OUTREACH_RECIPIENTS,
  MAX_OUTREACH_SUBJECT_CHARS,
  renderOutreachHtml,
} from "@/lib/outreach/email";

type TargetLanguage = "en" | "es";
type Version = "source" | "translation";

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-300 focus:border-black/30 dark:border-white/15 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/35";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-medium uppercase tracking-normal text-gray-400 dark:text-gray-500">
      {children}
    </span>
  );
}

function StatusBanner({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  const success = tone === "success";
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        success
          ? "border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400"
          : "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400"
      }`}
    >
      {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
      <p>{children}</p>
    </div>
  );
}

export function OutreachComposer({
  fromEmail,
  replyToEmail,
}: {
  fromEmail: string;
  replyToEmail: string;
}) {
  const [subject, setSubject] = useState(DEFAULT_OUTREACH_SUBJECT);
  const [body, setBody] = useState(DEFAULT_OUTREACH_BODY);
  const [translatedSubject, setTranslatedSubject] = useState("");
  const [translatedBody, setTranslatedBody] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>("en");
  const [version, setVersion] = useState<Version>("source");
  const [recipients, setRecipients] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [translationMessage, setTranslationMessage] = useState<
    { tone: "success" | "error"; text: string } | null
  >(null);
  const [sendMessage, setSendMessage] = useState<
    { tone: "success" | "error"; text: string } | null
  >(null);
  const [isTranslating, startTranslation] = useTransition();
  const [isSending, startSending] = useTransition();

  const parsedRecipients = useMemo(
    () => parseBulkSubscriberEmails(recipients),
    [recipients],
  );
  const activeSubject = version === "translation" ? translatedSubject : subject;
  const activeBody = version === "translation" ? translatedBody : body;
  const activeLanguage = version === "translation" ? targetLanguage : "es";
  const emailHtml = useMemo(
    () => renderOutreachHtml(activeBody, activeLanguage),
    [activeBody, activeLanguage],
  );
  const canSend =
    confirmed &&
    parsedRecipients.emails.length > 0 &&
    parsedRecipients.emails.length <= MAX_OUTREACH_RECIPIENTS &&
    parsedRecipients.invalidCount === 0 &&
    activeSubject.trim().length > 0 &&
    activeBody.trim().length > 0;

  function handleTranslate() {
    setTranslationMessage(null);
    startTranslation(async () => {
      const result = await translateOutreachEmail({ subject, body, targetLanguage });
      if ("error" in result) {
        setTranslationMessage({ tone: "error", text: result.error });
        return;
      }
      setTranslatedSubject(result.translation.subject);
      setTranslatedBody(result.translation.body);
      setVersion("translation");
      setConfirmed(false);
      setTranslationMessage({ tone: "success", text: "Traducción lista para revisar y editar." });
    });
  }

  function handleSend() {
    setSendMessage(null);
    startSending(async () => {
      const result = await sendOutreachEmail({
        subject: activeSubject,
        body: activeBody,
        recipients,
        confirmed,
        language: version === "translation" ? targetLanguage : "es",
      });
      if ("error" in result) {
        setSendMessage({ tone: "error", text: result.error });
        return;
      }
      setConfirmed(false);
      setSendMessage({ tone: "success", text: result.message });
    });
  }

  return (
    <div>
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">AI Builders Latam</p>
        <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">Outreach</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Edita el correo, crea una traducción con IA y envía una copia individual a cada destinatario.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4 dark:border-white/10">
            <div className="flex rounded-full bg-black/5 p-1 dark:bg-white/10">
              <button
                type="button"
                onClick={() => { setVersion("source"); setConfirmed(false); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition ${version === "source" ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => { setVersion("translation"); setConfirmed(false); }}
                disabled={!translatedBody}
                className={`rounded-full px-4 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${version === "translation" ? "bg-white text-gray-900 shadow-sm dark:bg-neutral-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}
              >
                Traducción
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-700 transition hover:border-black/25 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30"
              >
                <Eye className="h-4 w-4" />
                Ver email real
              </button>
              <select
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value as TargetLanguage)}
                className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-gray-600 outline-none dark:border-white/15 dark:bg-neutral-950 dark:text-gray-300"
              >
                <option value="en">Inglés</option>
                <option value="es">Español</option>
              </select>
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-normal text-gray-700 transition hover:border-black/25 disabled:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30"
              >
                <Languages className="h-4 w-4" />
                {isTranslating ? "Traduciendo..." : translatedBody ? "Retraducir" : "Traducir con IA"}
              </button>
            </div>
          </div>

          {translationMessage && (
            <div className="mt-4">
              <StatusBanner tone={translationMessage.tone}>{translationMessage.text}</StatusBanner>
            </div>
          )}

          <div className="mt-5 grid gap-5">
            <label className="grid gap-2">
              <FieldLabel>Asunto</FieldLabel>
              <input
                value={activeSubject}
                onChange={(event) => {
                  if (version === "translation") setTranslatedSubject(event.target.value);
                  else setSubject(event.target.value);
                  setConfirmed(false);
                }}
                maxLength={MAX_OUTREACH_SUBJECT_CHARS}
                className={fieldClass}
              />
              <span className="text-right text-xs text-gray-400">{activeSubject.length}/{MAX_OUTREACH_SUBJECT_CHARS}</span>
            </label>

            <label className="grid gap-2">
              <FieldLabel>Contenido</FieldLabel>
              <textarea
                value={activeBody}
                onChange={(event) => {
                  if (version === "translation") setTranslatedBody(event.target.value);
                  else setBody(event.target.value);
                  setConfirmed(false);
                }}
                rows={19}
                maxLength={MAX_OUTREACH_BODY_CHARS}
                className={`${fieldClass} resize-y leading-7`}
              />
              <span className="flex items-center justify-between gap-3 text-xs text-gray-400">
                <span>Separa párrafos con una línea en blanco. Puedes usar enlaces Markdown.</span>
                <span>{activeBody.length.toLocaleString("es-MX")}/{MAX_OUTREACH_BODY_CHARS.toLocaleString("es-MX")}</span>
              </span>
            </label>
          </div>

        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
            <FieldLabel>Remitente</FieldLabel>
            <dl className="mt-3 grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-gray-400">From verificado</dt>
                <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">{fromEmail}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Respuestas a</dt>
                <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">{replyToEmail}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
            <label className="grid gap-2">
              <FieldLabel>Destinatarios</FieldLabel>
              <textarea
                value={recipients}
                onChange={(event) => { setRecipients(event.target.value); setConfirmed(false); }}
                rows={10}
                placeholder="persona@empresa.com\notra@empresa.com"
                className={`${fieldClass} resize-y font-mono text-xs leading-6`}
              />
            </label>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-black/5 px-2 py-2 dark:bg-white/5">
                <strong className="block text-base text-gray-800 dark:text-gray-100">{parsedRecipients.emails.length}</strong>
                <span className="text-gray-400">válidos</span>
              </div>
              <div className="rounded-lg bg-black/5 px-2 py-2 dark:bg-white/5">
                <strong className="block text-base text-gray-800 dark:text-gray-100">{parsedRecipients.duplicateInputCount}</strong>
                <span className="text-gray-400">duplicados</span>
              </div>
              <div className="rounded-lg bg-black/5 px-2 py-2 dark:bg-white/5">
                <strong className="block text-base text-gray-800 dark:text-gray-100">{parsedRecipients.invalidCount}</strong>
                <span className="text-gray-400">inválidos</span>
              </div>
            </div>

            {parsedRecipients.emails.length > MAX_OUTREACH_RECIPIENTS && (
              <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                Máximo {MAX_OUTREACH_RECIPIENTS} destinatarios por envío.
              </p>
            )}
            {parsedRecipients.invalidSamples.length > 0 && (
              <p className="mt-3 break-words text-xs text-red-600 dark:text-red-400">
                Revisa: {parsedRecipients.invalidSamples.join(", ")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-black/20"
              />
              <span>
                Confirmo el envío de la versión {version === "translation" ? "traducida" : "original"} a {parsedRecipients.emails.length} destinatarios.
              </span>
            </label>

            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend || isSending}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-normal text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              <Send className="h-4 w-4" />
              {isSending ? "Enviando..." : `Enviar ${parsedRecipients.emails.length || ""} correos`}
            </button>
          </section>

          {sendMessage && <StatusBanner tone={sendMessage.tone}>{sendMessage.text}</StatusBanner>}
        </aside>
      </div>

      {showEmail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowEmail(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/40">Email real</p>
                <p className="mt-0.5 truncate text-sm text-white/80">
                  {activeSubject || "Sin asunto"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmail(false)}
                className="shrink-0 font-mono text-xs font-bold uppercase tracking-normal text-white/40 transition hover:text-white"
              >
                Cerrar ×
              </button>
            </div>
            <iframe
              title="Email real de outreach"
              srcDoc={emailHtml}
              className="w-full flex-1 bg-stone-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
