import { and, eq, inArray, sql } from "drizzle-orm";
import type { Resend } from "resend";
import type { DB } from "@/lib/db/client";
import { contacts, newsletterIssues, newsletterSends, newsletterWarmup } from "@/lib/db/schema";
import type { Issue } from "./types";
import { renderBuildLog } from "./render";
import { injectUnsubscribe, unsubscribeHeaders } from "./unsubscribe";
import { injectTracking } from "./tracking";

export interface SendBatchDeps {
  db: DB;
  resend: Resend;
  from: string;
  replyTo: string | undefined;
}

export interface SendBatchPayload {
  issueId: string;
  contactIds: string[];
}

// Send one batch of an issue's pending recipients. Idempotent: it re-reads the
// pending rows, so recipients already marked "sent" are never re-mailed on retry.
export async function processSendBatch(
  deps: SendBatchDeps,
  { issueId, contactIds }: SendBatchPayload,
): Promise<void> {
  const { db, resend, from, replyTo } = deps;

  const [issueRow] = await db
    .select({ data: newsletterIssues.data })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, issueId))
    .limit(1);
  const issue = issueRow?.data as Issue | undefined;
  if (!issue) return; // issue deleted mid-flight; nothing to do

  const pending = await db
    .select({ contactId: newsletterSends.contactId, email: contacts.email })
    .from(newsletterSends)
    .innerJoin(contacts, eq(newsletterSends.contactId, contacts.id))
    .where(
      and(
        eq(newsletterSends.issueId, issueId),
        inArray(newsletterSends.contactId, contactIds),
        eq(newsletterSends.status, "pending"),
      ),
    );

  if (pending.length === 0) {
    await finalizeIfComplete(db, issueId);
    return;
  }

  const html = renderBuildLog(issue);
  const res = await resend.batch.send(
    pending.map((r) => ({
      from,
      to: [r.email],
      subject: issue.spanish?.subject ?? issue.subject,
      html: injectTracking(injectUnsubscribe(html, r.contactId, issueId), r.contactId, issueId),
      replyTo,
      headers: unsubscribeHeaders(r.contactId, issueId),
    })),
  );
  if (res.error) {
    // Surface the real Resend error (pg-boss otherwise swallows it on retry).
    console.error(
      `[send-batch] Resend rechazó batch de ${pending.length} (issue ${issueId}):`,
      JSON.stringify(res.error),
    );
    // Throw so pg-boss retries with backoff. Rows stay "pending" → clean re-send.
    throw new Error(`Resend batch falló: ${res.error.message}`);
  }
  console.log(`[send-batch] ${pending.length} enviados (issue ${issueId}).`);

  const ids = (res.data?.data ?? []) as { id: string }[];
  await Promise.all(
    pending.map((r, i) =>
      db
        .update(newsletterSends)
        .set({
          status: "sent",
          resendId: ids[i]?.id ?? null,
          error: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(newsletterSends.issueId, issueId),
            eq(newsletterSends.contactId, r.contactId),
          ),
        ),
    ),
  );

  await finalizeIfComplete(db, issueId);
}

// Flip the issue to "sent" once no recipients remain pending. The
// status='sending' guard makes this safe to call from every batch concurrently.
export async function finalizeIfComplete(db: DB, issueId: string): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsletterSends)
    .where(
      and(
        eq(newsletterSends.issueId, issueId),
        eq(newsletterSends.status, "pending"),
      ),
    );
  if (count > 0) return;
  const [activeWarmup] = await db
    .select({ id: newsletterWarmup.id })
    .from(newsletterWarmup)
    .where(and(eq(newsletterWarmup.issueId, issueId), eq(newsletterWarmup.active, true)))
    .limit(1);
  if (activeWarmup) return;
  await db
    .update(newsletterIssues)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(newsletterIssues.id, issueId), eq(newsletterIssues.status, "sending")),
    );
}

// Dead-letter handler: the batch exhausted its retries. Mark its still-pending
// rows "failed" so the issue can finalize and the UI can offer a retry.
export async function failBatch(
  db: DB,
  { issueId, contactIds }: SendBatchPayload,
): Promise<void> {
  await db
    .update(newsletterSends)
    .set({ status: "failed", error: "Falló tras reintentos", updatedAt: new Date() })
    .where(
      and(
        eq(newsletterSends.issueId, issueId),
        inArray(newsletterSends.contactId, contactIds),
        eq(newsletterSends.status, "pending"),
      ),
    );
  await finalizeIfComplete(db, issueId);
}
