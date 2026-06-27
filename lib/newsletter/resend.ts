import { Resend } from "resend";

// Resend config for the Next.js app (Railway). Unlike the CLI's loadConfig
// (scripts/newsletter/lib/env.ts), this reads process.env directly — on
// Railway these are set as service variables, not a local .env file.
//
// The newsletter sends through Resend's transactional API (resend.batch.send)
// to our own contacts table — Broadcasts/Audiences are no longer used.
//
// Required to send:
//   RESEND_API_KEY, NEWSLETTER_FROM
// Optional:
//   NEWSLETTER_REPLY_TO

export interface NewsletterConfig {
  resend: Resend;
  from: string;
  replyTo: string | undefined;
}

class MissingEnvError extends Error {}

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new MissingEnvError(
      `Falta la variable de entorno ${name}. Configúrala en Railway (servicio website-v2).`,
    );
  }
  return v;
}

export function loadNewsletterConfig(): NewsletterConfig {
  const apiKey = required("RESEND_API_KEY");
  const from = required("NEWSLETTER_FROM");
  return {
    resend: new Resend(apiKey),
    from,
    replyTo: process.env.NEWSLETTER_REPLY_TO?.trim() || undefined,
  };
}

export { MissingEnvError };
