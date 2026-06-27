import type { Issue } from "./types";

// A blank, render-safe Issue used to seed a new draft. Every array is empty
// (the renderer tolerates empty sections) and scalar fields carry gentle
// placeholders so the composer and preview have something to show on day one.
export function emptyIssue(slug: string): Issue {
  return {
    slug,
    subject: "",
    preview: "Lo que importa esta semana para nuestra comunidad.",
    issueLabel: `Issue ${slug}`,
    date: "",
    readingTime: "6 min de lectura",
    title: "The Build Log",
    subtitle:
      "Lo que importa esta semana para nuestra comunidad. Solo señal, cero ruido.",
    stories: [],
    essay: {
      eyebrow: "Ensayo · 3 min de lectura",
      title: "",
      body: "",
      author: "",
      authorRole: "",
      linkText: "Leer ensayo",
      linkHref: "",
    },
    useCases: [],
    events: [],
    community: {
      label: "Resumen de la semana",
      title: "",
      titleSuffix: "",
      body: "",
      stats: [],
    },
    jobs: [],
  };
}
