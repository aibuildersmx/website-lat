// JSON Schema for a standalone email, published by the MCP tools' inputSchema.
// Mirrors validateStandalone; tests/mcp/schema.test.ts keeps them in sync.
const shortText = { type: "string", maxLength: 2_000 } as const;
const bodyText = { type: "string", maxLength: 30_000 } as const;

export const standaloneEmailJsonSchema = {
  type: "object",
  description:
    "Email suelto a la lista (no The Build Log). Un solo idioma. body es markdown restringido: " +
    "párrafos (línea en blanco), '## encabezado', '- lista', **negritas**, *itálicas*, [texto](https://…), " +
    "e imágenes '![texto alternativo](url)' solas en su párrafo, con url de upload_newsletter_image. " +
    "Cualquier HTML sale escapado.",
  properties: {
    slug: { type: "string", maxLength: 64, description: "Asignado por el servidor; se ignora al crear/editar." },
    subject: { ...shortText, description: "Asunto del email" },
    preview: { ...shortText, description: "Texto de preview del inbox" },
    title: { ...shortText, description: "Título grande del email" },
    subtitle: { ...bodyText, description: "Opcional" },
    body: bodyText,
    cta: {
      type: "object",
      description: "Botón opcional",
      properties: {
        text: shortText,
        href: { type: "string", maxLength: 2_048, pattern: "^(https?://|mailto:)" },
      },
      required: ["text", "href"],
      additionalProperties: false,
    },
  },
  required: ["subject", "preview", "title", "body"],
  additionalProperties: false,
} as const;
