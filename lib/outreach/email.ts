export const MAX_OUTREACH_RECIPIENTS = 100;
export const MAX_OUTREACH_SUBJECT_CHARS = 180;
export const MAX_OUTREACH_BODY_CHARS = 20_000;

export const DEFAULT_OUTREACH_SUBJECT = "Patrocina el newsletter de AI Builders Latam";

export const DEFAULT_OUTREACH_BODY = `Hola, soy Ben de [AI Builders Latam](https://aibuilders.lat). Te escribo rápido.

Nuestro newsletter llega a 2,404+ builders de IA, desarrolladores y fundadores técnicos de habla hispana, y la mayoría de nuestra comunidad está en Ciudad de México.

Como parte de nuestra oferta de lanzamiento, un espacio patrocinado cuesta actualmente $2,000 MXN. Incluye tu empresa o producto, una breve descripción y un enlace en nuestra próxima edición disponible.

Puedes consultar los detalles y reservar un espacio aquí:
[Reservar un espacio patrocinado](https://vacantes.lat/checkout/ad-sponsor)

Si otra persona se encarga de marketing o alianzas, te agradecería mucho una presentación.`;

export interface OutreachTranslation {
  subject: string;
  body: string;
}

export type OutreachLanguage = "es" | "en";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function renderInline(value: string): string {
  const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
  let output = "";
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    output += escapeHtml(value.slice(cursor, index));
    const label = match[1];
    const candidate = match[2] ?? match[3];
    const href = safeHttpUrl(candidate);
    if (!href) {
      output += escapeHtml(match[0]);
    } else {
      output += `<a href="${escapeHtml(href)}" style="color:#2563eb;text-decoration:underline;">${escapeHtml(label ?? candidate)}</a>`;
    }
    cursor = index + match[0].length;
  }

  return output + escapeHtml(value.slice(cursor));
}

export function renderOutreachHtml(body: string, language: OutreachLanguage = "es"): string {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#262626;">${renderInline(paragraph).replaceAll("\n", "<br>")}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="${language}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;">
    <tr><td style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;">
        <tr><td style="padding:32px;">
          ${paragraphs}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function outreachPlainText(body: string): string {
  return body.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2").trim();
}

export function parseOutreachTranslation(value: unknown): OutreachTranslation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("OpenAI no devolvió una traducción válida.");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.subject !== "string" || typeof record.body !== "string") {
    throw new Error("La traducción no contiene asunto y contenido.");
  }
  return { subject: record.subject, body: record.body };
}
