export const MAX_OUTREACH_RECIPIENTS = 100;
export const MAX_OUTREACH_SUBJECT_CHARS = 180;
export const MAX_OUTREACH_BODY_CHARS = 20_000;

export const DEFAULT_OUTREACH_SUBJECT = "Patrocina el newsletter de AI Builders Latam";

export const DEFAULT_OUTREACH_BODY = `Hola, soy Ben, de [AI Builders Latam](https://aibuilders.lat), la mayor comunidad de builders de habla hispana.

Nuestro newsletter llega directamente a 2,404+ desarrolladores y fundadores técnicos que construyen con IA todos los días.

Acabamos de abrir la convocatoria para patrocinar nuestra próxima edición: un espacio ideal para dar a conocer tu empresa o producto ante una audiencia técnica y comprometida.

Como parte de nuestra oferta de lanzamiento la inversión es de $2,000 USD por espacio, y los lugares son limitados.

👉 Reserva tu espacio patrocinado aquí: [Reservar un espacio patrocinado](https://vacantes.lat/checkout/ad-sponsor)

Si tienes preguntas, respóndeme este correo con gusto.

Saludos,
Ben`;

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
