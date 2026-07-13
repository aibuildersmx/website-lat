"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, newsletterIssues, newsletterSends } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import type { BaseIssue, Issue } from "@/lib/newsletter/types";
import { emptyIssue } from "@/lib/newsletter/issue";
import { insertNewsletterDraft } from "@/lib/newsletter/draft-create";
import { renderBuildLog } from "@/lib/newsletter/render";
import { loadNewsletterConfig, MissingEnvError } from "@/lib/newsletter/resend";
import { subscribedRecipients, chunk } from "@/lib/newsletter/recipients";
import { injectUnsubscribe, siteUrl } from "@/lib/newsletter/unsubscribe";
import { stripTracking } from "@/lib/newsletter/tracking";
import {
  initialBulkImportState,
  parseBulkSubscriberEmails,
  type BulkImportState,
} from "@/lib/newsletter/bulk-import";
import {
  engagementSummary,
  topClickedLinks,
  type EngagementSummary,
  type LinkClicks,
} from "@/lib/newsletter/engagement";
import { getBoss, SEND_BATCH_QUEUE } from "@/lib/queue/boss";
import { normalizeAdminLanguage } from "@/lib/admin/language";
import {
  extractResponseText,
  mergeSpanishTranslation,
  originalIssue,
  parseTranslationJson,
} from "@/lib/newsletter/translation";

const LIST_PATH = "/admin/newsletter";
const AUDIENCE_PATH = "/admin/audience";
const BULK_IMPORT_SOURCE = "admin-bulk-import";
const MAX_BULK_IMPORT_EMAILS = 10_000;

const MONTH_INDEX: Record<string, number> = {
  ene: 0,
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  apr: 3,
  april: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  september: 8,
  oct: 9,
  octubre: 9,
  october: 9,
  nov: 10,
  noviembre: 10,
  november: 10,
  dic: 11,
  diciembre: 11,
  dec: 11,
  december: 11,
};

function issueDateSortValue(date: string): number | null {
  const normalized = date
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .toLowerCase();
  const year = normalized.match(/\b(20\d{2})\b/)?.[1];
  if (!year) return null;

  const month = [...normalized.matchAll(/\b[a-z]{3,10}\b/g)]
    .map((match) => match[0])
    .filter((word) => word in MONTH_INDEX)
    .at(-1);
  if (!month) return null;

  const day = [...normalized.matchAll(/\b\d{1,2}\b/g)]
    .map((match) => Number(match[0]))
    .filter((value) => value >= 1 && value <= 31)
    .at(-1);
  if (!day) return null;

  return Date.UTC(Number(year), MONTH_INDEX[month], day);
}

function issueSlugSortValue(slug: string): number {
  const numeric = Number(slug);
  return Number.isFinite(numeric) ? numeric : -1;
}

type ActionError = { error: string };
type ActionOk = { ok: true; message?: string };

async function gate(): Promise<ActionError | null> {
  const user = await getUser();
  if (!user) return { error: "No autorizado." };
  return null;
}

// Replace Resend's unsubscribe placeholder so previews/tests render a real (no-op)
// link instead of a literal token. The real token is only injected by Resend
// when it sends an actual broadcast.
function previewHtml(issue: Issue): string {
  return stripTracking(
    renderBuildLog(issue).replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#"),
  );
}

async function uploadedText(value: FormDataEntryValue | null): Promise<string> {
  if (
    value &&
    typeof value === "object" &&
    "size" in value &&
    "text" in value &&
    typeof value.text === "function" &&
    Number(value.size) > 0
  ) {
    return value.text();
  }
  return "";
}

export interface IssueListItem {
  id: string;
  slug: string;
  subject: string;
  status: string;
  archivePublished: boolean;
  date: string;
  sentAt: Date | null;
  updatedAt: Date;
}

export async function listIssues(): Promise<IssueListItem[]> {
  if (await gate()) return [];
  const rows = await db
    .select({
      id: newsletterIssues.id,
      slug: newsletterIssues.slug,
      subject: newsletterIssues.subject,
      status: newsletterIssues.status,
      data: newsletterIssues.data,
      sentAt: newsletterIssues.sentAt,
      updatedAt: newsletterIssues.updatedAt,
    })
    .from(newsletterIssues)
    .orderBy(desc(newsletterIssues.updatedAt));
  return rows
    .map(({ data, ...row }) => ({
      ...row,
      date: data.date,
      archivePublished: data.archivePublished !== false,
    }))
    .sort((a, b) => {
      const aDate = issueDateSortValue(a.date);
      const bDate = issueDateSortValue(b.date);
      if (aDate !== null && bDate !== null && aDate !== bDate) return bDate - aDate;
      if (aDate !== null && bDate === null) return -1;
      if (aDate === null && bDate !== null) return 1;

      const slugDiff = issueSlugSortValue(b.slug) - issueSlugSortValue(a.slug);
      if (slugDiff !== 0) return slugDiff;

      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}

export interface IssueDetail {
  id: string;
  slug: string;
  status: string;
  sentAt: Date | null;
  data: Issue;
}

export async function getIssue(id: string): Promise<IssueDetail | null> {
  if (await gate()) return null;
  const rows = await db
    .select()
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    sentAt: row.sentAt,
    data: row.data,
  };
}

// Next slug = max existing numeric slug + 1, zero-padded to 3 digits.
function nextSlug(existing: string[]): string {
  const max = existing.reduce((m, s) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1).padStart(3, "0");
}

export async function createIssue(): Promise<void> {
  if (await gate()) return;
  const id = await createIssueDraft();
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}/${id}`);
}

export async function getNewIssueDraftData(): Promise<Issue> {
  if (await gate()) redirect("/login");
  const slugs = await db
    .select({ slug: newsletterIssues.slug })
    .from(newsletterIssues);
  return emptyIssue(nextSlug(slugs.map((r) => r.slug)));
}

export async function createIssueDraft(data?: Issue): Promise<string> {
  if (await gate()) redirect("/login");
  const inserted = await insertNewsletterDraft(data, undefined, { respectRequestedSlug: true });
  revalidatePath(LIST_PATH);
  return inserted.id;
}

export async function toggleIssueArchiveVisibility(formData: FormData): Promise<void> {
  if (await gate()) return;

  const id = String(formData.get("id") ?? "");
  const archivePublished = String(formData.get("archivePublished") ?? "") === "true";
  if (!id) return;

  await db
    .update(newsletterIssues)
    .set({
      data: sql`${newsletterIssues.data} || ${JSON.stringify({ archivePublished })}::jsonb`,
      version: sql`${newsletterIssues.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(newsletterIssues.id, id));

  revalidatePath(LIST_PATH);
  revalidatePath("/newsletters");
}

export async function deleteDraftIssue(formData: FormData): Promise<void> {
  if (await gate()) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(newsletterIssues)
    .where(and(eq(newsletterIssues.id, id), eq(newsletterIssues.status, "draft")));

  revalidatePath(LIST_PATH);
}

export async function bulkImportSubscribers(
  _previousState: BulkImportState,
  formData: FormData,
): Promise<BulkImportState> {
  const language = normalizeAdminLanguage(String(formData.get("admin_language") ?? ""));
  const bulkCopy =
    language === "en"
      ? {
          unauthorized: "Unauthorized.",
          noValid: "No valid emails found to import.",
          max: `Maximum ${MAX_BULK_IMPORT_EMAILS.toLocaleString("en-US")} unique emails per import.`,
          noneAdded: "No new contacts were added; they all already existed.",
          added: (count: number) => `Added ${count.toLocaleString("en-US")} new contacts.`,
        }
      : {
          unauthorized: "No autorizado.",
          noValid: "No encontramos correos válidos para importar.",
          max: `Máximo ${MAX_BULK_IMPORT_EMAILS.toLocaleString("es-MX")} correos únicos por importación.`,
          noneAdded: "No se agregaron contactos nuevos; todos ya existían.",
          added: (count: number) => `Se agregaron ${count.toLocaleString("es-MX")} contactos nuevos.`,
        };

  if (await gate()) {
    return { ...initialBulkImportState, message: bulkCopy.unauthorized };
  }

  const pasted = String(formData.get("emails") ?? "");
  const uploaded = await uploadedText(formData.get("file"));
  const parsed = parseBulkSubscriberEmails(`${pasted}\n${uploaded}`);

  if (parsed.emails.length === 0) {
    return {
      ...initialBulkImportState,
      ...parsed,
      uniqueCount: 0,
      message: bulkCopy.noValid,
    };
  }

  if (parsed.emails.length > MAX_BULK_IMPORT_EMAILS) {
    return {
      ...initialBulkImportState,
      ...parsed,
      uniqueCount: parsed.emails.length,
      message: bulkCopy.max,
    };
  }

  const inserted = await db
    .insert(contacts)
    .values(
      parsed.emails.map((email) => ({
        email,
        sources: [BULK_IMPORT_SOURCE],
        newsletterSubscribed: true,
        newsletterSubscribedAt: sql`now()`,
      })),
    )
    .onConflictDoNothing({ target: contacts.email })
    .returning({ email: contacts.email });

  const insertedCount = inserted.length;
  const skippedCount = parsed.emails.length - insertedCount;
  revalidatePath(AUDIENCE_PATH);

  return {
    ok: true,
    message:
      insertedCount === 0
        ? bulkCopy.noneAdded
        : bulkCopy.added(insertedCount),
    inputCount: parsed.inputCount,
    uniqueCount: parsed.emails.length,
    insertedCount,
    skippedCount,
    duplicateInputCount: parsed.duplicateInputCount,
    invalidCount: parsed.invalidCount,
    invalidSamples: parsed.invalidSamples,
  };
}

export async function saveIssue(
  id: string,
  data: Issue,
): Promise<ActionOk | ActionError> {
  if (await gate()) return { error: "No autorizado." };
  // Keep the row's denormalized columns in sync with the canonical Issue JSON.
  const updated = await db
    .update(newsletterIssues)
    .set({
      data,
      slug: data.slug,
      subject: data.subject,
      version: sql`${newsletterIssues.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(newsletterIssues.id, id), eq(newsletterIssues.status, "draft")))
    .returning({ id: newsletterIssues.id });
  if (!updated[0]) return { error: "Este newsletter ya no es un borrador editable." };
  revalidatePath(`${LIST_PATH}/${id}`);
  revalidatePath(LIST_PATH);
  return { ok: true };
}

// Server-rendered preview HTML for the composer's iframe. Always reflects the
// data the client passes (which may be unsaved).
export async function renderPreview(data: Issue): Promise<string> {
  if (await gate()) return "<!doctype html><title>No autorizado</title>";
  return previewHtml(data);
}

type TranslationResult =
  | { ok: true; translation: BaseIssue }
  | { error: string };

const MAX_TRANSLATION_INPUT_CHARS = 100_000;

export async function translateIssueToSpanish(id: string): Promise<TranslationResult> {
  if (await gate()) return { error: "No autorizado." };
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Falta OPENAI_API_KEY en la configuración del servidor." };
  }

  const [row] = await db
    .select({ data: newsletterIssues.data, status: newsletterIssues.status })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, id))
    .limit(1);
  if (!row) return { error: "Issue no encontrado." };
  if (row.status !== "draft") return { error: "Solo se pueden traducir borradores." };

  const source = originalIssue(row.data);
  const input = JSON.stringify(source);
  if (input.length > MAX_TRANSLATION_INPUT_CHARS) {
    return { error: "El newsletter es demasiado grande para traducirlo en una sola solicitud." };
  }
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5.4-mini",
        max_output_tokens: 20_000,
        instructions:
          "Translate the supplied newsletter JSON into natural, concise Latin American Spanish. " +
          "Return only one valid JSON object with exactly the same keys, arrays, item order, and data types. " +
          "Translate human-facing prose, titles, labels, subject, preview, and roles. " +
          "Do not translate or alter URLs, slugs, dates, issue numbers, personal names, product names, " +
          "AI BUILDERS LATAM, AI Builders México, The Build Log, or location names. " +
          "Preserve empty strings. Do not add markdown fences or commentary.",
        input,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return { error: `OpenAI rechazó la traducción (${response.status}).` };
    }

    const payload = (await response.json()) as unknown;
    const translated = mergeSpanishTranslation(
      source,
      parseTranslationJson(extractResponseText(payload)),
    );
    return { ok: true, translation: translated };
  } catch (error) {
    console.error("Newsletter translation failed:", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      return { error: "La traducción tardó demasiado. Intenta de nuevo." };
    }
    return { error: "No se pudo completar la traducción. Intenta de nuevo." };
  }
}

export async function sendTest(
  data: Issue,
  email: string,
): Promise<ActionOk | ActionError> {
  if (await gate()) return { error: "No autorizado." };
  const to = email.trim().toLowerCase();
  if (!to.includes("@")) return { error: "Ingresa un correo válido." };
  if (!data.spanish) return { error: "Genera la versión en español antes de enviar una prueba." };
  if (!data.spanish.subject.trim()) return { error: "La versión en español necesita un subject." };

  let cfg;
  try {
    cfg = loadNewsletterConfig();
  } catch (e) {
    if (e instanceof MissingEnvError) return { error: e.message };
    throw e;
  }

  // Render a real "Cancelar suscripción" link instead of the no-op "#" used in
  // the in-panel preview. If the test recipient is a real contact, sign their id
  // so the link behaves exactly like production; otherwise point to the live
  // unsubscribe page (it shows a friendly "couldn't verify" message).
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.email, to))
    .limit(1);
  // Strip the open pixel — a test send has no persisted issue id to attribute to.
  const html = stripTracking(
    contact
      ? injectUnsubscribe(renderBuildLog(data), contact.id)
      : renderBuildLog(data).replace(
          /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g,
          `${siteUrl()}/unsubscribe`,
        ),
  );

  const res = await cfg.resend.emails.send({
    from: cfg.from,
    to: [to],
    subject: `[TEST] ${data.spanish.subject}`,
    html,
    replyTo: cfg.replyTo,
  });
  if (res.error) return { error: `Envío de prueba falló: ${res.error.message}` };
  return { ok: true, message: `Prueba enviada a ${to}.` };
}

export async function sendIssue(id: string): Promise<ActionOk | ActionError> {
  if (await gate()) return { error: "No autorizado." };

  const detail = await getIssue(id);
  if (!detail) return { error: "Issue no encontrado." };
  if (detail.status === "sent") return { error: "Este issue ya fue enviado." };
  if (detail.status === "sending") return { error: "Este issue ya se está enviando." };

  const data = detail.data;
  if (!data.spanish) return { error: "Genera la versión en español antes de enviar." };
  if (data.spanishTranslationStale) {
    return { error: "La traducción está desactualizada. Actualízala antes de enviar." };
  }
  if (!data.spanish.subject.trim()) return { error: "La versión en español necesita un subject." };
  if (!data.spanish.stories.length) return { error: "Agrega al menos una historia antes de enviar." };

  // Fail fast if Resend isn't configured — the same env the worker needs.
  try {
    loadNewsletterConfig();
  } catch (e) {
    if (e instanceof MissingEnvError) return { error: e.message };
    throw e;
  }

  const recipients = await subscribedRecipients();
  if (!recipients.length) return { error: "No hay contactos suscritos al newsletter." };

  // 1. One pending row per recipient (idempotent — re-send is a no-op).
  await db
    .insert(newsletterSends)
    .values(
      recipients.map((r) => ({ issueId: id, contactId: r.id, status: "pending" as const })),
    )
    .onConflictDoNothing({
      target: [newsletterSends.issueId, newsletterSends.contactId],
    });

  // 2. Mark the issue as sending.
  await db
    .update(newsletterIssues)
    .set({ status: "sending", updatedAt: new Date() })
    .where(eq(newsletterIssues.id, id));

  // 3. Enqueue one job per chunk of 100 recipients.
  const boss = await getBoss();
  for (const group of chunk(recipients)) {
    await boss.send(SEND_BATCH_QUEUE, {
      issueId: id,
      contactIds: group.map((r) => r.id),
    });
  }

  revalidatePath(`${LIST_PATH}/${id}`);
  revalidatePath(LIST_PATH);
  return { ok: true, message: `Encolado: enviando a ${recipients.length} contactos.` };
}

export async function retryFailed(id: string): Promise<ActionOk | ActionError> {
  if (await gate()) return { error: "No autorizado." };

  const failed = await db
    .select({ contactId: newsletterSends.contactId })
    .from(newsletterSends)
    .where(and(eq(newsletterSends.issueId, id), eq(newsletterSends.status, "failed")));
  if (!failed.length) return { error: "No hay envíos fallidos para reintentar." };

  await db
    .update(newsletterSends)
    .set({ status: "pending", error: null, updatedAt: new Date() })
    .where(and(eq(newsletterSends.issueId, id), eq(newsletterSends.status, "failed")));

  await db
    .update(newsletterIssues)
    .set({ status: "sending", sentAt: null, updatedAt: new Date() })
    .where(eq(newsletterIssues.id, id));

  const ids = failed.map((r) => r.contactId);
  const boss = await getBoss();
  for (const group of chunk(ids)) {
    await boss.send(SEND_BATCH_QUEUE, { issueId: id, contactIds: group });
  }

  revalidatePath(`${LIST_PATH}/${id}`);
  revalidatePath(LIST_PATH);
  return { ok: true, message: `Reintentando ${ids.length} envíos.` };
}

export interface IssueProgress {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface IssueEngagement extends EngagementSummary {
  topLinks: LinkClicks[];
}

export async function getIssueEngagement(id: string): Promise<IssueEngagement> {
  const empty: IssueEngagement = {
    sent: 0,
    opens: 0,
    clicks: 0,
    unsubscribes: 0,
    bounces: 0,
    complaints: 0,
    newSubscribers: 0,
    openRate: 0,
    clickRate: 0,
    unsubscribeRate: 0,
    bounceRate: 0,
    complaintRate: 0,
    hasData: false,
    topLinks: [],
  };
  if (await gate()) return empty;
  const [summary, topLinks] = await Promise.all([
    engagementSummary(id),
    topClickedLinks(id),
  ]);
  return { ...summary, topLinks };
}

export async function getIssueProgress(id: string): Promise<IssueProgress> {
  if (await gate()) return { total: 0, sent: 0, failed: 0, pending: 0 };
  const rows = await db
    .select({ status: newsletterSends.status, count: sql<number>`count(*)::int` })
    .from(newsletterSends)
    .where(eq(newsletterSends.issueId, id))
    .groupBy(newsletterSends.status);
  const by = (s: string) => rows.find((r) => r.status === s)?.count ?? 0;
  const sent = by("sent");
  const failed = by("failed");
  const pending = by("pending");
  return { total: sent + failed + pending, sent, failed, pending };
}

// --- Phase 4 seam (NOT wired yet) -------------------------------------------
// AI-assisted editing will land here as a server action that mutates a single
// section of the Issue and returns the updated Issue:
//
//   export async function enhanceSection(id: string, section: keyof Issue,
//     instruction: string): Promise<Issue | ActionError>
//
// It will call the Anthropic SDK with the section's current JSON + instruction,
// validate the model's output against the Issue type, persist via saveIssue, and
// return the new Issue. The same function is intended to be wrapped 1:1 as an MCP
// tool so an agent edits issues through the exact same door as the panel.
// Deliberately omitted in Phase 3 — the panel ships humans-only first.
