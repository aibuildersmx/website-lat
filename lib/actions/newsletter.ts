"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, newsletterIssues, newsletterSends } from "@/lib/db/schema";
import { getUser } from "@/lib/auth";
import type { Issue } from "@/lib/newsletter/types";
import { emptyIssue } from "@/lib/newsletter/issue";
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

const LIST_PATH = "/admin/newsletter";
const BULK_IMPORT_SOURCE = "admin-bulk-import";
const MAX_BULK_IMPORT_EMAILS = 10_000;

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

export interface IssueListItem {
  id: string;
  slug: string;
  subject: string;
  status: string;
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
      sentAt: newsletterIssues.sentAt,
      updatedAt: newsletterIssues.updatedAt,
    })
    .from(newsletterIssues)
    .orderBy(desc(newsletterIssues.updatedAt));
  return rows;
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
  const slugs = await db
    .select({ slug: newsletterIssues.slug })
    .from(newsletterIssues);
  const slug = nextSlug(slugs.map((r) => r.slug));
  const data = emptyIssue(slug);
  const inserted = await db
    .insert(newsletterIssues)
    .values({ slug, subject: data.subject, status: "draft", data })
    .returning({ id: newsletterIssues.id });
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}/${inserted[0].id}`);
}

export async function bulkImportSubscribers(
  _previousState: BulkImportState,
  formData: FormData,
): Promise<BulkImportState> {
  if (await gate()) {
    return { ...initialBulkImportState, message: "No autorizado." };
  }

  const pasted = String(formData.get("emails") ?? "");
  const file = formData.get("file");
  const uploaded =
    file instanceof File && file.size > 0
      ? await file.text()
      : "";
  const parsed = parseBulkSubscriberEmails(`${pasted}\n${uploaded}`);

  if (parsed.emails.length === 0) {
    return {
      ...initialBulkImportState,
      ...parsed,
      uniqueCount: 0,
      message: "No encontramos correos válidos para importar.",
    };
  }

  if (parsed.emails.length > MAX_BULK_IMPORT_EMAILS) {
    return {
      ...initialBulkImportState,
      ...parsed,
      uniqueCount: parsed.emails.length,
      message: `Máximo ${MAX_BULK_IMPORT_EMAILS.toLocaleString("es-MX")} correos únicos por importación.`,
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
  revalidatePath(LIST_PATH);

  return {
    ok: true,
    message:
      insertedCount === 0
        ? "No se agregaron contactos nuevos; todos ya existían."
        : `Se agregaron ${insertedCount.toLocaleString("es-MX")} contactos nuevos.`,
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
  await db
    .update(newsletterIssues)
    .set({
      data,
      slug: data.slug,
      subject: data.subject,
      updatedAt: new Date(),
    })
    .where(eq(newsletterIssues.id, id));
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

export async function sendTest(
  data: Issue,
  email: string,
): Promise<ActionOk | ActionError> {
  if (await gate()) return { error: "No autorizado." };
  const to = email.trim().toLowerCase();
  if (!to.includes("@")) return { error: "Ingresa un correo válido." };
  if (!data.subject.trim()) return { error: "El issue necesita un subject antes de enviar." };

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
    subject: `[TEST] ${data.subject}`,
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
  if (!data.subject.trim()) return { error: "El issue necesita un subject." };
  if (!data.stories.length) return { error: "Agrega al menos una historia antes de enviar." };

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
