import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts, newsletterDirectSends, newsletterIssues } from "@/lib/db/schema";
import { stripTracking } from "./open-pixel";
import { standaloneWarnings } from "./preview";
import { emailSubject, renderEmail } from "./render-email";
import { loadNewsletterConfig } from "./resend";
import type { StandaloneEmail } from "./standalone-types";
import { injectUnsubscribe, siteUrl, unsubscribeHeaders } from "./unsubscribe";
import { validateStandalone } from "./validation";

// Sends one standalone email to one address, outside the list/warmup pipeline.
// Guardrails live here, not in the MCP layer: only standalone drafts (never
// The Build Log), never to someone who unsubscribed, at most once per
// (draft, address). Recipients outside the contacts table are allowed but
// come back with a warning.

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;

export type DirectSendErrorCode =
  | "invalid_recipient"
  | "not_found"
  | "wrong_kind"
  | "invalid_email"
  | "unsubscribed"
  | "already_sent"
  | "send_failed";

export class DirectSendError extends Error {
  constructor(readonly code: DirectSendErrorCode, message: string, readonly details?: string[]) {
    super(message);
  }
}

export interface DirectSendResult {
  sent: true;
  to: string;
  subject: string;
  isContact: boolean;
  resendId: string | null;
  warnings: string[];
}

export async function sendStandaloneTo(
  issueId: string,
  rawTo: string,
  tokenId: string | null,
): Promise<DirectSendResult> {
  const to = rawTo.trim().toLowerCase();
  if (!EMAIL_RE.test(to) || to.length > 320) {
    throw new DirectSendError("invalid_recipient", "to must be a single email address.");
  }

  const [row] = await db
    .select({ kind: newsletterIssues.kind, data: newsletterIssues.data })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, issueId))
    .limit(1);
  if (!row) throw new DirectSendError("not_found", "Email not found.");
  if (row.kind !== "standalone") {
    throw new DirectSendError(
      "wrong_kind",
      "Only standalone emails can be sent to one address. The Build Log only goes out to the list, from /admin/newsletter.",
    );
  }

  const validated = validateStandalone(row.data);
  if (validated.errors) {
    throw new DirectSendError("invalid_email", "The stored email is not valid. Fix it with update_standalone_email.", validated.errors);
  }
  const email: StandaloneEmail = validated.email;
  if (!email.subject.trim() || !email.title.trim() || !email.body.trim()) {
    throw new DirectSendError("invalid_email", "subject, title, and body must not be empty before sending.");
  }

  const [contact] = await db
    .select({ id: contacts.id, subscribed: contacts.newsletterSubscribed })
    .from(contacts)
    .where(eq(contacts.email, to))
    .limit(1);
  if (contact && !contact.subscribed) {
    throw new DirectSendError("unsubscribed", `${to} unsubscribed from AI Builders emails. It can't be sent to them.`);
  }

  // Load config before claiming, so a missing env var doesn't burn the claim.
  const cfg = loadNewsletterConfig();

  const [claim] = await db
    .insert(newsletterDirectSends)
    .values({ issueId, email: to, contactId: contact?.id ?? null, tokenId })
    .onConflictDoNothing()
    .returning({ id: newsletterDirectSends.id });
  if (!claim) throw new DirectSendError("already_sent", `This email was already sent to ${to}.`);

  const draft = { kind: "standalone", data: email } as const;
  const rendered = renderEmail(draft);
  // No open pixel or click tracking: those are attributed to list sends.
  const html = stripTracking(
    contact
      ? injectUnsubscribe(rendered, contact.id)
      : rendered.replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, `${siteUrl()}/unsubscribe`),
  );

  const res = await cfg.resend.emails.send({
    from: cfg.from,
    to: [to],
    subject: emailSubject(draft),
    html,
    replyTo: cfg.replyTo,
    ...(contact ? { headers: unsubscribeHeaders(contact.id) } : {}),
  });
  if (res.error) {
    // Release the claim so a retry can go through.
    await db.delete(newsletterDirectSends).where(eq(newsletterDirectSends.id, claim.id));
    throw new DirectSendError("send_failed", `Resend rejected the send: ${res.error.message}`);
  }

  const resendId = res.data?.id ?? null;
  await db
    .update(newsletterDirectSends)
    .set({ resendId })
    .where(eq(newsletterDirectSends.id, claim.id));

  const warnings = standaloneWarnings(email);
  if (!contact) {
    warnings.unshift(
      `${to} is not in the AI Builders contacts list. It was sent anyway: check the address is right and that this person expects the email. Their unsubscribe link can't remove them from anything.`,
    );
  }
  return { sent: true, to, subject: email.subject, isContact: !!contact, resendId, warnings };
}
