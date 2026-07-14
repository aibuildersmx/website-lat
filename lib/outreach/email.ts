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
