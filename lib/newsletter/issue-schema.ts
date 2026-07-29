// JSON Schema for the canonical newsletter Issue, published by the MCP tools'
// inputSchema. Mirrors the runtime checks in lib/newsletter/validation.ts;
// tests/mcp/schema.test.ts keeps the two from drifting.

const shortText = { type: "string", maxLength: 2_000 } as const;
const bodyText = { type: "string", maxLength: 30_000 } as const;
const urlText = {
  type: "string",
  maxLength: 2_048,
  description: "URL https:// o mailto:, o cadena vacía para renderizar sin link",
  pattern: "^(https?://|mailto:|$)",
} as const;

function arrayOf(items: object, description?: string) {
  return { type: "array", maxItems: 100, items, ...(description ? { description } : {}) } as const;
}

const storySchema = {
  type: "object",
  properties: {
    eyebrow: { ...shortText, description: 'Etiqueta corta, ej. "01 · Desarrollo"' },
    title: shortText,
    href: urlText,
    body: { ...bodyText, description: 'Cuerpo de la nota; suele abrir con "Por qué importa: ..."' },
  },
  required: ["eyebrow", "title", "href", "body"],
  additionalProperties: false,
} as const;

const essaySchema = {
  type: "object",
  properties: {
    eyebrow: { ...shortText, description: 'Ej. "Ensayo · 3 min de lectura"' },
    title: shortText,
    body: bodyText,
    author: shortText,
    authorRole: shortText,
    linkText: shortText,
    linkHref: urlText,
  },
  required: ["eyebrow", "title", "body", "author", "authorRole", "linkText", "linkHref"],
  additionalProperties: false,
} as const;

const useCaseSchema = {
  type: "object",
  properties: {
    icon: { type: "string", maxLength: 32, description: 'Un solo glifo, ej. "⌁"' },
    title: shortText,
    body: bodyText,
  },
  required: ["icon", "title", "body"],
  additionalProperties: false,
} as const;

const projectSchema = {
  type: "object",
  description: "Proyecto de la comunidad (mapea de showcase_items del MCP de Aiby)",
  properties: {
    eyebrow: { ...shortText, description: 'Ej. "Salud · MVP" (derivado de tags/dominio)' },
    title: shortText,
    author: { ...shortText, description: "Crédito del builder — el punto de la sección" },
    href: urlText,
    body: bodyText,
  },
  required: ["eyebrow", "title", "author", "href", "body"],
  additionalProperties: false,
} as const;

const eventSchema = {
  type: "object",
  properties: {
    day: { type: "string", maxLength: 16, description: 'Ej. "18"' },
    month: { type: "string", maxLength: 24, description: 'Ej. "Jun"' },
    label: { ...shortText, description: 'Lugar, ej. "VIRTUAL" o "Ciudad de México"' },
    title: shortText,
    body: bodyText,
    href: urlText,
  },
  required: ["day", "month", "label", "title", "body", "href"],
  additionalProperties: false,
} as const;

const communitySchema = {
  type: "object",
  properties: {
    label: { ...shortText, description: 'Ej. "Resumen de la semana"' },
    title: shortText,
    titleSuffix: { ...shortText, description: 'Ej. "· herramientas dev · Claude Code ..."' },
    body: bodyText,
    stats: arrayOf(shortText, "Líneas de bullets"),
  },
  required: ["label", "title", "titleSuffix", "body", "stats"],
  additionalProperties: false,
} as const;

const jobSchema = {
  type: "object",
  properties: {
    label: { ...shortText, description: 'Ej. "Contratando"' },
    title: shortText,
    meta: { ...shortText, description: 'Ej. "Freelance · remoto LatAm · 4 a 6 meses"' },
    href: urlText,
  },
  required: ["label", "title", "meta", "href"],
  additionalProperties: false,
} as const;

const buildersLinkSchema = {
  type: "object",
  properties: { text: shortText, href: urlText },
  required: ["text", "href"],
  additionalProperties: false,
} as const;

const buildersItemSchema = {
  type: "object",
  properties: { title: shortText, body: bodyText, href: urlText },
  required: ["title", "body", "href"],
  additionalProperties: false,
} as const;

const sponsorSchema = {
  type: "object",
  properties: {
    title: shortText,
    description: bodyText,
    href: urlText,
  },
  required: ["title", "href"],
  additionalProperties: false,
} as const;

export const BASE_ISSUE_REQUIRED = [
  "slug", "subject", "preview", "issueLabel", "date", "readingTime", "title",
  "subtitle", "stories", "essay", "useCases", "events", "community", "jobs",
] as const;

const baseIssueProperties = {
  slug: { type: "string", maxLength: 64, description: 'Identificador público, ej. "002"' },
  archivePublished: { type: "boolean", description: "false oculta issues enviados del archivo público" },
  subject: { ...shortText, description: "Subject del email" },
  preview: { ...shortText, description: "Texto de preview del inbox" },
  issueLabel: { ...shortText, description: 'Ej. "Issue 002"' },
  showIssueLabel: { type: "boolean", description: "Default true en issues existentes" },
  date: { ...shortText, description: 'Ej. "31 May 2026"' },
  readingTime: { ...shortText, description: 'Ej. "6 min de lectura"' },
  title: { ...shortText, description: 'Ej. "The Build Log"' },
  subtitle: bodyText,
  adPlacement: {
    type: "string",
    enum: ["top", "after_stories", "after_essay", "before_footer"],
    description: "Dónde se renderiza el slot de sponsor (default top)",
  },
  sponsor: sponsorSchema,
  stories: arrayOf(storySchema),
  essay: essaySchema,
  useCases: arrayOf(useCaseSchema),
  projectsLabel: { ...shortText, description: 'Heading de projects (default "Proyectos de la comunidad")' },
  projects: arrayOf(projectSchema),
  eventsLabel: { ...shortText, description: 'Heading de events (default "Próximos eventos")' },
  events: arrayOf(eventSchema),
  buildersMexico: buildersLinkSchema,
  buildersMexicoItems: arrayOf(buildersItemSchema),
  community: communitySchema,
  jobs: arrayOf(jobSchema),
} as const;

export const newsletterIssueJsonSchema = {
  type: "object",
  description:
    "The canonical structured newsletter Issue. El issue base se escribe en el idioma de trabajo; " +
    "la variante `spanish` (la que se envía) se genera en el composer y normalmente se omite aquí.",
  properties: {
    ...baseIssueProperties,
    spanish: {
      type: "object",
      description: "Variante en español que se envía. Generada en el composer; normalmente omitida por autores.",
      properties: baseIssueProperties,
      required: [...BASE_ISSUE_REQUIRED],
      additionalProperties: false,
    },
    spanishTranslationStale: { type: "boolean" },
  },
  required: [...BASE_ISSUE_REQUIRED],
  additionalProperties: false,
} as const;
