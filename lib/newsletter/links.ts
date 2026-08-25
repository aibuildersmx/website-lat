import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./unsubscribe";

// Signed link redirector. Newsletter bodies link through our own reputable domain
// (aibuilders.mx/r/...) instead of pasting raw third-party URLs (x.com, luma, ...).
// Raw social/shortener links in bulk mail are a classic spam signal; routing every
// outbound link through our domain keeps the email's visible URLs on a domain with
// real reputation and positions AIBM as the curator of the links it shares.
//
// The target URL is HMAC-signed (same RESEND_API_KEY secret as the unsubscribe
// links) so /r can NEVER be turned into an open redirect: only URLs we wrapped
// resolve; anything tampered with is rejected. No DB, no per-link table to migrate.

function secret(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta RESEND_API_KEY: se usa para firmar los enlaces del newsletter.",
    );
  }
  return key;
}

/** base64url(url) — URL-safe, no padding, fits cleanly in a path segment. */
function encodeTarget(url: string): string {
  return Buffer.from(url, "utf8").toString("base64url");
}

function decodeTarget(token: string): string | null {
  try {
    return Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/** HMAC-SHA256(token) truncated — proves the wrapped link was issued by us. */
function sign(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex").slice(0, 32);
}

/** Constant-time check that `sig` matches the one we would issue for `token`. */
function verifySig(token: string, sig: string): boolean {
  if (!token || !sig) return false;
  const expected = Buffer.from(sign(token));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/**
 * Wrap an outbound link so it routes through aibuilders.mx/r. Only external
 * http(s) links are wrapped; mailto:, anchors, and links already on our own
 * domain are returned untouched (no point bouncing those through the redirector).
 */
export function wrapLink(
  url: string,
  { includeSiteLinks = false }: { includeSiteLinks?: boolean } = {},
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url; // mailto:, relative, malformed — leave as-is
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return url;

  const site = new URL(siteUrl());
  if (parsed.hostname === site.hostname && !includeSiteLinks) return url; // already our domain

  const token = encodeTarget(url);
  return `${siteUrl()}/r/${token}?s=${sign(token)}`;
}

/**
 * Route every web link in rendered newsletter HTML through the signed
 * redirector. This must run immediately before sending: links created in the
 * admin composer do not pass through the legacy import script, and therefore
 * would otherwise bypass first-party click attribution.
 *
 * The renderer only emits quoted href attributes. Existing redirect links are
 * left alone, so this is safe for imported issues as well.
 */
export function wrapEmailLinks(html: string): string {
  return html.replace(
    /(<a\b[^>]*\bhref=)(["'])([^"']*)(\2)/gi,
    (_match, prefix: string, quote: string, href: string) => {
      // render.ts HTML-escapes content URLs, so recover query-string ampersands
      // before signing the actual destination.
      const target = href.replaceAll("&amp;", "&");
      try {
        const parsed = new URL(target);
        if (parsed.pathname.startsWith("/r/") && parsed.origin === new URL(siteUrl()).origin) {
          return `${prefix}${quote}${target}${quote}`;
        }
      } catch {
        // Let wrapLink preserve relative, malformed, and non-web destinations.
      }
      return `${prefix}${quote}${wrapLink(target, { includeSiteLinks: true })}${quote}`;
    },
  );
}

/** Resolve a /r token+signature back to its target URL, or null if invalid. */
export function resolveRedirect(token: string, sig: string): string | null {
  if (!verifySig(token, sig)) return null;
  const url = decodeTarget(token);
  if (!url) return null;
  // Defense in depth: the HMAC already guarantees we issued this, but never emit
  // a Location that isn't a real web URL.
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}
