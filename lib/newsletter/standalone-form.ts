// Client-safe (type-only imports): turns the standalone editor's raw fields
// into a savable email. Optional parts that would fail validation are dropped
// instead of blocking the whole autosave; ctaProblem tells the author why.
import type { StandaloneEmail } from "./standalone-types";

const CTA_URL = /^(https?:\/\/|mailto:)/i;

export function ctaProblem(text: string, href: string): string | null {
  const hasText = Boolean(text.trim());
  const hasHref = Boolean(href.trim());
  if (!hasText && !hasHref) return null;
  if (!hasText || !hasHref) return "El botón necesita texto y URL.";
  if (!CTA_URL.test(href.trim())) return "La URL del botón debe empezar con https:// o mailto:.";
  return null;
}

export function formToEmail(fields: {
  base: StandaloneEmail;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
}): StandaloneEmail {
  const { base, subtitle, ctaText, ctaHref } = fields;
  const email: StandaloneEmail = {
    slug: base.slug,
    subject: base.subject,
    preview: base.preview,
    title: base.title,
    body: base.body,
  };
  if (subtitle.trim()) email.subtitle = subtitle;
  if (ctaText.trim() && !ctaProblem(ctaText, ctaHref)) email.cta = { text: ctaText, href: ctaHref.trim() };
  return email;
}
