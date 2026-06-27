import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db/client";
import { newsletterEvents } from "@/lib/db/schema";
import { siteUrl } from "./unsubscribe";

// First-party open/click tracking. Resend's own tracking is kept OFF (it rewrites
// links through its domain and serves a third-party pixel — spam signals); instead
// we attribute engagement on aibuilders.mx. Per-contact data is injected at send
// time, mirroring injectUnsubscribe. Opens are HMAC-signed with RESEND_API_KEY (the
// same secret used for unsubscribe + the /r redirector — no new secret to manage).

// Literal the renderer emits where the open pixel goes (see render.ts), swapped for
// a real per-contact pixel URL at send time.
const OPEN_PIXEL_PLACEHOLDER = "{{{OPEN_PIXEL}}}";

function secret(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("Falta RESEND_API_KEY: se usa para firmar el pixel de tracking del newsletter.");
  }
  return key;
}

/** HMAC over contactId+issueId — proves the open pixel was issued by us. */
export function trackToken(contactId: string, issueId: string): string {
  return createHmac("sha256", secret()).update(`${contactId}.${issueId}`).digest("hex").slice(0, 32);
}

/** Constant-time check of an open-pixel signature. */
export function verifyTrackToken(contactId: string, issueId: string, token: string): boolean {
  if (!contactId || !issueId || !token) return false;
  const expected = Buffer.from(trackToken(contactId, issueId));
  const got = Buffer.from(token);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** Absolute, signed 1×1 open-pixel URL for a recipient. */
export function openPixelUrl(contactId: string, issueId: string): string {
  return `${siteUrl()}/api/newsletter/o/${contactId}.gif?i=${issueId}&s=${trackToken(contactId, issueId)}`;
}

/**
 * Personalize a rendered email for one recipient: swap the open-pixel placeholder
 * for their signed pixel, and tag every /r redirector link with the contact + issue
 * so clicks are attributed. Run alongside injectUnsubscribe at send time.
 */
export function injectTracking(html: string, contactId: string, issueId: string): string {
  const withPixel = html.split(OPEN_PIXEL_PLACEHOLDER).join(openPixelUrl(contactId, issueId));
  // Append attribution to our own /r links only (target stays HMAC-signed via `s`).
  return withPixel.replace(
    /(\/r\/[A-Za-z0-9_-]+\?s=[a-f0-9]+)(?=")/g,
    `$1&c=${contactId}&i=${issueId}`,
  );
}

/** Remove tracking for previews / contact-less test sends (no live pixel placeholder). */
export function stripTracking(html: string): string {
  return html.split(OPEN_PIXEL_PLACEHOLDER).join("");
}

/** Record an engagement event. Fire-and-forget: never throws into the request path. */
export async function logEvent(e: {
  issueId: string;
  contactId: string;
  type: "open" | "click";
  url?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await db.insert(newsletterEvents).values({
      issueId: e.issueId,
      contactId: e.contactId,
      type: e.type,
      url: e.url ?? null,
      userAgent: e.userAgent ?? null,
    });
  } catch (err) {
    console.error("[tracking] logEvent failed:", err);
  }
}
