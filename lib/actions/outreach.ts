"use server";

import { getUser } from "@/lib/auth";
import { parseBulkSubscriberEmails } from "@/lib/newsletter/bulk-import";
import { loadNewsletterConfig, MissingEnvError } from "@/lib/newsletter/resend";
import { extractResponseText } from "@/lib/newsletter/translation";
import {
  MAX_OUTREACH_BODY_CHARS,
  MAX_OUTREACH_RECIPIENTS,
  MAX_OUTREACH_SUBJECT_CHARS,
  outreachHtml,
  outreachPlainText,
  parseOutreachTranslation,
  type OutreachTranslation,
} from "@/lib/outreach/email";

type OutreachError = { error: string; sentCount?: number };
type OutreachSendOk = { ok: true; sentCount: number; message: string };
type OutreachTranslationResult = { ok: true; translation: OutreachTranslation } | OutreachError;

const TARGET_LANGUAGES = {
  en: "English",
  es: "Latin American Spanish",
} as const;

async function adminUser() {
  const user = await getUser();
  return user?.role === "admin" ? user : null;
}

function validateContent(subject: string, body: string): string | null {
  if (!subject.trim()) return "Agrega un asunto.";
  if (!body.trim()) return "Agrega el contenido del correo.";
  if (subject.length > MAX_OUTREACH_SUBJECT_CHARS) {
    return `El asunto no puede superar ${MAX_OUTREACH_SUBJECT_CHARS} caracteres.`;
  }
  if (body.length > MAX_OUTREACH_BODY_CHARS) {
    return `El contenido no puede superar ${MAX_OUTREACH_BODY_CHARS.toLocaleString("es-MX")} caracteres.`;
  }
  return null;
}

export async function translateOutreachEmail(input: {
  subject: string;
  body: string;
  targetLanguage: keyof typeof TARGET_LANGUAGES;
}): Promise<OutreachTranslationResult> {
  if (!(await adminUser())) return { error: "No autorizado." };
  const validationError = validateContent(input.subject, input.body);
  if (validationError) return { error: validationError };

  const targetLanguage = TARGET_LANGUAGES[input.targetLanguage];
  if (!targetLanguage) return { error: "Idioma de destino no válido." };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { error: "Falta OPENAI_API_KEY en la configuración del servidor." };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.4-mini",
        max_output_tokens: 4_000,
        instructions:
          `Translate this outreach email into natural, concise ${targetLanguage}. ` +
          "Preserve paragraph breaks, prices, numbers, URLs, Markdown links, AI Builders Latam, " +
          "Ciudad de México, product names, and company names. Do not add claims or commentary.",
        input: JSON.stringify({ subject: input.subject, body: input.body }),
        text: {
          format: {
            type: "json_schema",
            name: "outreach_translation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
              },
              required: ["subject", "body"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return { error: `OpenAI rechazó la traducción (${response.status}).` };
    }

    const payload = (await response.json()) as unknown;
    const parsed = JSON.parse(extractResponseText(payload)) as unknown;
    return { ok: true, translation: parseOutreachTranslation(parsed) };
  } catch (error) {
    console.error("Outreach translation failed:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      return { error: "La traducción tardó demasiado. Intenta de nuevo." };
    }
    return { error: "No se pudo completar la traducción. Intenta de nuevo." };
  }
}

export async function sendOutreachEmail(input: {
  subject: string;
  body: string;
  recipients: string;
  confirmed: boolean;
}): Promise<OutreachSendOk | OutreachError> {
  const user = await adminUser();
  if (!user) return { error: "No autorizado." };
  const validationError = validateContent(input.subject, input.body);
  if (validationError) return { error: validationError };
  if (!input.confirmed) return { error: "Confirma el envío antes de continuar." };

  const parsed = parseBulkSubscriberEmails(input.recipients);
  if (!parsed.emails.length) return { error: "Agrega al menos un correo válido." };
  if (parsed.emails.length > MAX_OUTREACH_RECIPIENTS) {
    return { error: `Máximo ${MAX_OUTREACH_RECIPIENTS} destinatarios por envío.` };
  }
  if (parsed.invalidCount > 0) {
    return { error: "Corrige o elimina los correos inválidos antes de enviar." };
  }

  let cfg;
  try {
    cfg = loadNewsletterConfig();
  } catch (error) {
    if (error instanceof MissingEnvError) return { error: error.message };
    throw error;
  }

  const text = outreachPlainText(input.body);
  const response = await cfg.resend.batch.send(
    parsed.emails.map((email) => ({
      from: cfg.from,
      to: [email],
      subject: input.subject.trim(),
      html: outreachHtml(input.body),
      text,
      replyTo: user.email,
    })),
  );

  if (response.error) {
    console.error("Outreach send failed:", response.error.message);
    return { error: `Resend rechazó el envío: ${response.error.message}`, sentCount: 0 };
  }

  return {
    ok: true,
    sentCount: parsed.emails.length,
    message: `Enviado a ${parsed.emails.length.toLocaleString("es-MX")} destinatarios.`,
  };
}
