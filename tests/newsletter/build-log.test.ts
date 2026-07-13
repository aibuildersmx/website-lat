import { describe, it, expect } from "vitest";
import { renderBuildLog } from "@/lib/newsletter/render";
import issue002 from "./fixtures/sample-issue";

describe("renderBuildLog", () => {
  const html = renderBuildLog(issue002);

  it("includes the issue title and subtitle", () => {
    expect(html).toContain("The Build Log");
    expect(html).toContain(issue002.subtitle);
  });

  it("can hide the issue number without hiding the remaining metadata", () => {
    const out = renderBuildLog({ ...issue002, showIssueLabel: false });
    expect(out).not.toContain(issue002.issueLabel);
    expect(out).toContain(issue002.date);
    expect(out).toContain(issue002.readingTime);
  });

  it("renders the saved Spanish version when present", () => {
    const spanish = structuredClone(issue002);
    spanish.subtitle = "Subtítulo final en español";
    spanish.stories[0].title = "Historia final en español";
    const out = renderBuildLog({ ...issue002, spanish });
    expect(out).toContain("Subtítulo final en español");
    expect(out).toContain("Historia final en español");
    expect(out).not.toContain(issue002.stories[0].title);
  });

  it("renders compact sponsor inventory and the permanent advertiser CTA", () => {
    expect(html).toContain("https://vacantes.lat/checkout/ad-sponsor");

    const out = renderBuildLog({
      ...issue002,
      sponsor: {
        title: "Construye agentes de voz",
        description: "Infraestructura para equipos que construyen en producción.",
        href: "https://sponsor.example/product",
      },
    });
    expect(out).toContain("Construye agentes de voz");
    expect(out).toContain("Infraestructura para equipos");
    expect(out).toContain("https://sponsor.example/product");
  });

  it("renders every story title and link", () => {
    for (const s of issue002.stories) {
      expect(html).toContain(s.title);
      expect(html).toContain(s.href);
      expect(html).not.toContain(s.eyebrow);
    }
  });

  it("renders the essay, events, and community card, but omits retired sections", () => {
    expect(html).toContain(issue002.essay.title);
    expect(html).toContain(issue002.events[0].title);
    expect(html).not.toContain(issue002.useCases[0].title);
    expect(html).toContain("Comunidad");
    expect(html).toContain(issue002.community.label);
    expect(html).toContain(issue002.community.title);
    expect(html).toContain(issue002.community.body);
    expect(html).toContain(issue002.community.stats[0]);
    expect(html).toContain("01");
    expect(html).not.toContain(issue002.jobs[0].title);
    expect(html).not.toContain("AIBM · Online");
    expect(html).toContain("VIRTUAL");
  });

  it("omits the community section when its card is empty", () => {
    const out = renderBuildLog({
      ...issue002,
      community: { label: "Golden nugget", title: "", titleSuffix: "", body: "", stats: [] },
    });
    expect(out).not.toContain("Comunidad");
    expect(out).not.toContain("Golden nugget");
  });

  it("renders the community projects section with author credits and links", () => {
    const withProjects = {
      ...issue002,
      projects: [
        {
          eyebrow: "Salud · MVP",
          title: "Cuidado",
          author: "Esdras Josué",
          href: "https://cuidado-web-production.up.railway.app/cuidado",
          body: "Mini app para coordinar cuidados de salud.",
        },
      ],
    };
    const out = renderBuildLog(withProjects);
    expect(out).toContain("Proyectos de la comunidad");
    expect(out).toContain("Cuidado");
    expect(out).toContain("por Esdras Josué");
    expect(out).toContain("https://cuidado-web-production.up.railway.app/cuidado");
  });

  it("omits the community projects section when there are no projects", () => {
    expect(renderBuildLog(issue002)).not.toContain("Proyectos de la comunidad");
  });

  it("renders the optional AI Builders México link only when configured", () => {
    expect(html).not.toContain("Desde AI Builders México");

    const out = renderBuildLog({
      ...issue002,
      buildersMexicoItems: [
        {
          title: "Nueva guía de agentes",
          body: "Cómo diseñamos agentes que resuelven trabajo real.",
          href: "https://aibuilders.mx/guias/agentes",
        },
        {
          title: "Semana cuatro de La Residencia",
          body: "Proyectos y aprendizajes de los residentes.",
          href: "https://aibuilders.mx/residencia/semana-4",
        },
      ],
    });
    expect(out).toContain("Desde AI Builders México");
    expect(out).toContain("Nueva guía de agentes");
    expect(out).toContain("https://aibuilders.mx/guias/agentes");
    expect(out).toContain("Semana cuatro de La Residencia");
    expect(out).toContain("Proyectos y aprendizajes de los residentes.");
  });

  it("includes the Resend unsubscribe token", () => {
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("AI BUILDERS LATAM");
    expect(html).not.toContain("AI Builders MX");
    expect(html).not.toContain("Ciudad de México");
    expect(html).not.toContain("Ámsterdam 255");
    expect(html).toContain('href="https://aibuilders.lat"');
    expect(html).toContain('href="https://aibuilders.mx"');
    expect(html).toContain("Patrocina una edición");
    expect(html).toContain("Explora vacantes");
    expect(html).toContain('href="https://vacantes.lat"');
    expect(html).toContain("AI BUILDERS LATAM");
    expect(html).toContain("AI BUILDERS MEXICO");
  });

  it("is email-safe and includes progressive title-link hover styling", () => {
    expect(html).not.toContain("clamp(");
    expect(html).not.toContain("var(--");
    expect(html).toContain("a.title-link:hover");
    expect(html).toContain('class="title-link"');
  });

  it("escapes HTML special characters in content", () => {
    const evil = { ...issue002, title: "A & B <script>" };
    const out = renderBuildLog(evil);
    expect(out).toContain("A &amp; B &lt;script&gt;");
    expect(out).not.toContain("<script>");
  });
});
