import { createHmac, timingSafeEqual } from "node:crypto";

// Self-managed unsubscribe, replacing Resend's Broadcasts/Audiences machinery.
// We sign each contact id with the existing RESEND_API_KEY so there is no new
// secret to configure and no per-contact token column to migrate: the token is
// derived on send and re-derived (then compared) on unsubscribe.

const PLACEHOLDER = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function secret(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta RESEND_API_KEY: se usa para firmar los enlaces de baja del newsletter.",
    );
  }
  return key;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://aibuilders.mx";
}

function payload(contactId: string, issueId?: string | null): string {
  return issueId ? `${contactId}.${issueId}` : contactId;
}

/** HMAC-SHA256(contactId[.issueId]) truncated — proves the link was issued by us. */
export function unsubToken(contactId: string, issueId?: string | null): string {
  return createHmac("sha256", secret()).update(payload(contactId, issueId)).digest("hex").slice(0, 32);
}

/** Constant-time check that `token` matches the one we would issue for `contactId`. */
export function verifyUnsub(contactId: string, token: string, issueId?: string | null): boolean {
  if (!contactId || !token) return false;
  const expected = Buffer.from(unsubToken(contactId, issueId));
  const got = Buffer.from(token);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** Absolute one-click unsubscribe URL embedded in the email + List-Unsubscribe header. */
export function unsubscribeUrl(contactId: string, issueId?: string | null): string {
  const issue = issueId ? `&i=${encodeURIComponent(issueId)}` : "";
  return `${siteUrl()}/unsubscribe?c=${contactId}${issue}&t=${unsubToken(contactId, issueId)}`;
}

/** Swap the render's placeholder for this contact's real unsubscribe link. */
export function injectUnsubscribe(html: string, contactId: string, issueId?: string | null): string {
  return html.split(PLACEHOLDER).join(unsubscribeUrl(contactId, issueId));
}

/** RFC 8058 headers so Gmail/Yahoo show a native one-click unsubscribe button. */
export function unsubscribeHeaders(contactId: string, issueId?: string | null): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(contactId, issueId)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
