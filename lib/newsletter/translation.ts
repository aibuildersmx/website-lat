import type { BaseIssue, Issue } from "./types";

export function originalIssue(issue: Issue): BaseIssue {
  const original = { ...issue } as Partial<Issue>;
  delete original.spanish;
  delete original.spanishTranslationStale;
  return original as BaseIssue;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`La traducción no contiene ${label}.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`La traducción no contiene ${label}.`);
  return value;
}

function array(value: unknown, length: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new Error(`La traducción cambió la estructura de ${label}.`);
  }
  return value;
}

export function mergeSpanishTranslation(source: BaseIssue, value: unknown): BaseIssue {
  const candidate = record(value, "un objeto JSON válido");
  const stories = array(candidate.stories, source.stories.length, "historias");
  const useCases = array(candidate.useCases, source.useCases.length, "casos de uso");
  const events = array(candidate.events, source.events.length, "eventos");
  const jobs = array(candidate.jobs, source.jobs.length, "empleos");
  const projects = source.projects
    ? array(candidate.projects, source.projects.length, "proyectos")
    : undefined;
  const buildersMexicoItems = source.buildersMexicoItems
    ? array(
        candidate.buildersMexicoItems,
        source.buildersMexicoItems.length,
        "contenido de AI Builders México",
      )
    : undefined;
  const essay = record(candidate.essay, "el ensayo");
  const community = record(candidate.community, "la comunidad");
  const stats = array(
    community.stats,
    source.community.stats.length,
    "estadísticas de comunidad",
  );

  return {
    ...source,
    subject: text(candidate.subject, "el asunto"),
    preview: text(candidate.preview, "el preview"),
    subtitle: text(candidate.subtitle, "el subtítulo"),
    sponsor: source.sponsor
      ? {
          ...source.sponsor,
          title: text(record(candidate.sponsor, "el anuncio").title, "el título del anuncio"),
          description: source.sponsor.description
            ? text(
                record(candidate.sponsor, "el anuncio").description,
                "la descripción del anuncio",
              )
            : source.sponsor.description,
        }
      : source.sponsor,
    stories: source.stories.map((item, index) => {
      const translated = record(stories[index], `la historia ${index + 1}`);
      return {
        ...item,
        title: text(translated.title, `el título de la historia ${index + 1}`),
        body: text(translated.body, `el cuerpo de la historia ${index + 1}`),
      };
    }),
    essay: {
      ...source.essay,
      eyebrow: text(essay.eyebrow, "la etiqueta del ensayo"),
      title: text(essay.title, "el título del ensayo"),
      body: text(essay.body, "el cuerpo del ensayo"),
      authorRole: text(essay.authorRole, "el rol del autor"),
      linkText: text(essay.linkText, "el enlace del ensayo"),
    },
    useCases: source.useCases.map((item, index) => {
      const translated = record(useCases[index], `el caso de uso ${index + 1}`);
      return {
        ...item,
        title: text(translated.title, `el título del caso de uso ${index + 1}`),
        body: text(translated.body, `el cuerpo del caso de uso ${index + 1}`),
      };
    }),
    projectsLabel: source.projectsLabel
      ? text(candidate.projectsLabel, "el título de proyectos")
      : source.projectsLabel,
    projects: source.projects?.map((item, index) => {
      const translated = record(projects![index], `el proyecto ${index + 1}`);
      return {
        ...item,
        eyebrow: text(translated.eyebrow, `la etiqueta del proyecto ${index + 1}`),
        title: text(translated.title, `el título del proyecto ${index + 1}`),
        body: text(translated.body, `el cuerpo del proyecto ${index + 1}`),
      };
    }),
    eventsLabel: source.eventsLabel
      ? text(candidate.eventsLabel, "el título de eventos")
      : source.eventsLabel,
    events: source.events.map((item, index) => {
      const translated = record(events[index], `el evento ${index + 1}`);
      return {
        ...item,
        title: text(translated.title, `el título del evento ${index + 1}`),
        body: text(translated.body, `el cuerpo del evento ${index + 1}`),
      };
    }),
    buildersMexico: source.buildersMexico
      ? {
          ...source.buildersMexico,
          text: text(record(candidate.buildersMexico, "AI Builders México").text, "AI Builders México"),
        }
      : source.buildersMexico,
    buildersMexicoItems: source.buildersMexicoItems?.map((item, index) => {
      const translated = record(
        buildersMexicoItems![index],
        `el contenido de AI Builders México ${index + 1}`,
      );
      return {
        ...item,
        title: text(translated.title, `el título de AI Builders México ${index + 1}`),
        body: text(translated.body, `el cuerpo de AI Builders México ${index + 1}`),
      };
    }),
    community: {
      ...source.community,
      label: text(community.label, "la etiqueta de comunidad"),
      title: text(community.title, "el título de comunidad"),
      titleSuffix: text(community.titleSuffix, "el sufijo de comunidad"),
      body: text(community.body, "el cuerpo de comunidad"),
      stats: stats.map((item, index) => text(item, `la estadística ${index + 1}`)),
    },
    jobs: source.jobs.map((item, index) => {
      const translated = record(jobs[index], `el empleo ${index + 1}`);
      return {
        ...item,
        label: text(translated.label, `la etiqueta del empleo ${index + 1}`),
        title: text(translated.title, `el título del empleo ${index + 1}`),
        meta: text(translated.meta, `los detalles del empleo ${index + 1}`),
      };
    }),
  };
}

export function extractResponseText(value: unknown): string {
  const response = record(value, "la respuesta de OpenAI");
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  throw new Error("OpenAI no devolvió texto traducido.");
}

export function parseTranslationJson(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as unknown;
}
