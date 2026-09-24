// A one-off email to the newsletter list (announcements, invitations) — not
// The Build Log. Stored in newsletter_issues with kind = "standalone" so it
// rides the same send pipeline (batches, warm-up, tracking, unsubscribe).
import { randomBytes } from "node:crypto";

export const EMAIL_KINDS = ["build_log", "standalone"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export function isEmailKind(value: unknown): value is EmailKind {
  return typeof value === "string" && (EMAIL_KINDS as readonly string[]).includes(value);
}

export interface StandaloneCta {
  text: string;
  href: string;
}

export interface StandaloneEmail {
  slug: string; // "s-k3j9x0ab" — never numeric, so it never collides with "015"
  subject: string;
  preview: string; // inbox preview text
  title: string;
  subtitle?: string;
  body: string; // restricted markdown, see render-markdown.ts
  cta?: StandaloneCta;
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function standaloneSlug(): string {
  const bytes = randomBytes(8);
  return `s-${Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("")}`;
}

export function emptyStandalone(slug: string): StandaloneEmail {
  return { slug, subject: "", preview: "", title: "", body: "" };
}
