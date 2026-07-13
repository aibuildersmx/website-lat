export type ArticleSection = {
  id: string;
  heading: string;
  body: string;
};

export type ArticleContent = {
  sections: ArticleSection[];
};

export type ArticleStatus = "draft" | "published";

export function slugifyArticle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function normalizeArticleContent(value: unknown): ArticleContent {
  if (!value || typeof value !== "object" || !("sections" in value)) {
    return { sections: [] };
  }

  const sections = Array.isArray((value as { sections?: unknown }).sections)
    ? (value as { sections: unknown[] }).sections
    : [];

  const normalized = sections
      .slice(0, 50)
      .filter((section): section is Record<string, unknown> =>
        Boolean(section) && typeof section === "object" && !Array.isArray(section),
      )
      .map((section, index) => {
        const heading = typeof section.heading === "string" ? section.heading.trim().slice(0, 160) : "";
        const body = typeof section.body === "string" ? section.body.trim().slice(0, 50_000) : "";
        const requestedId = typeof section.id === "string" ? section.id : "";
        return {
          id: slugifyArticle(requestedId || heading) || `seccion-${index + 1}`,
          heading,
          body,
        };
      })
      .filter((section) => section.heading || section.body);

  const seen = new Map<string, number>();
  return {
    sections: normalized.map((section) => {
      const count = (seen.get(section.id) ?? 0) + 1;
      seen.set(section.id, count);
      return count === 1 ? section : { ...section, id: `${section.id}-${count}` };
    }),
  };
}
