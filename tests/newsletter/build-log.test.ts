import { describe, it, expect } from "vitest";
import { renderBuildLog } from "@/lib/newsletter/render";
import issue002 from "./fixtures/sample-issue";

describe("renderBuildLog", () => {
  const html = renderBuildLog(issue002);

  it("includes the issue title and subtitle", () => {
    expect(html).toContain("The Build Log");
    expect(html).toContain(issue002.subtitle);
  });

  it("renders every story title and link", () => {
    for (const s of issue002.stories) {
      expect(html).toContain(s.title);
      expect(html).toContain(s.href);
    }
  });

  it("renders the essay, events, and job", () => {
    expect(html).toContain(issue002.essay.title);
    expect(html).toContain(issue002.events[0].title);
    expect(html).toContain(issue002.jobs[0].title);
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

  it("includes the Resend unsubscribe token", () => {
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("is email-safe: no clamp(), no CSS vars, no <style> block", () => {
    expect(html).not.toContain("clamp(");
    expect(html).not.toContain("var(--");
    expect(html).not.toMatch(/<style[\s>]/);
  });

  it("escapes HTML special characters in content", () => {
    const evil = { ...issue002, title: "A & B <script>" };
    const out = renderBuildLog(evil);
    expect(out).toContain("A &amp; B &lt;script&gt;");
    expect(out).not.toContain("<script>");
  });
});
