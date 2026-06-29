// Canonical newsletter data model ("The Build Log").
//
// This is the single source of truth for the Issue shape. It is consumed by:
//   - the web composer at /admin/newsletter (humans edit it inline),
//   - the Resend send pipeline (renderBuildLog + buildBroadcastPayload),
//   - the legacy CLI in scripts/newsletter (which re-exports from here),
//   - and, in a later phase, an external generator + AI tools (Anthropic SDK)
//     + an MCP agent — all of which read/write this same structured JSON.
//
// Keep it structured (typed sections, not free-form markdown) precisely so
// every one of those editors operates on the same model.

export interface Story {
  eyebrow: string; // "01 · Desarrollo"
  title: string;
  href: string;
  body: string; // "Por qué importa: ..."
}

export interface Essay {
  eyebrow: string; // "Ensayo · 3 min de lectura"
  title: string;
  body: string;
  author: string;
  authorRole: string;
  linkText: string;
  linkHref: string;
}

export interface UseCase {
  icon: string; // single glyph, e.g. "⌁"
  title: string;
  body: string;
}

// Community member projects/launches. Mirrors Aiby's `showcase_items` shape
// (title, author_name, description, links, tags) so the weekly digest pulled
// from the MCP (`list_showcase` / `get_weekly_digest`) maps in directly.
export interface ShowcaseProject {
  eyebrow: string; // "Salud · MVP" (derived from tags/domain)
  title: string;
  author: string; // builder credit — the whole point of the section
  href: string; // primary link (empty → title renders unlinked)
  body: string; // description
}

export interface EventItem {
  day: string; // "18"
  month: string; // "Jun"
  label: string; // "AIBM · Online"
  title: string;
  body: string;
  href: string;
}

export interface Community {
  label: string; // "Resumen de la semana"
  title: string; // "Automatización"
  titleSuffix: string; // "· herramientas dev · Claude Code ..."
  body: string;
  stats: string[]; // bullet lines
}

export interface JobItem {
  label: string; // "Contratando"
  title: string;
  meta: string; // "Freelance · remoto LatAm · 4 a 6 meses"
  href: string;
}

export interface Issue {
  slug: string; // "002"
  subject: string; // email subject line
  preview: string; // inbox preview text
  issueLabel: string; // "Issue 002"
  date: string; // "31 May 2026"
  readingTime: string; // "6 min de lectura"
  title: string; // "The Build Log"
  subtitle: string;
  stories: Story[];
  essay: Essay;
  useCases: UseCase[];
  projectsLabel?: string; // section heading for `projects` (default "Proyectos de la comunidad")
  projects?: ShowcaseProject[];
  eventsLabel?: string; // section heading for `events` (default "Próximos eventos")
  events: EventItem[];
  community: Community;
  jobs: JobItem[];
}
