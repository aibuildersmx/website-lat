import { describe, expect, it } from "vitest";
import { renderStandalone } from "@/lib/newsletter/render-standalone";
import { emailPreviewHtml, emailSubject, renderEmail } from "@/lib/newsletter/render-email";
import { standaloneWarnings } from "@/lib/newsletter/preview";
import { emptyIssue } from "@/lib/newsletter/issue";
import { renderBuildLog } from "@/lib/newsletter/render";
import type { StandaloneEmail } from "@/lib/newsletter/standalone-types";

const email: StandaloneEmail = {
  slug: "s-abc12345",
  subject: "Hackathon este sábado",
  preview: "Últimos lugares",
  title: "Nos vemos el sábado",
  subtitle: "Build night en CDMX",
  body: "Hola **builders**.\n\n- Pizza\n- Premios",
  cta: { text: "Regístrate", href: "https://aibuilders.mx/eventos" },
};

describe("renderStandalone", () => {
  const html = renderStandalone(email);

  it("renders title, subtitle, markdown body and CTA", () => {
    expect(html).toContain("Nos vemos el sábado");
    expect(html).toContain("Build night en CDMX");
    expect(html).toContain("<strong>builders</strong>");
    expect(html).toContain("<li");
    expect(html).toContain('href="https://aibuilders.mx/eventos"');
    expect(html).toContain("Regístrate");
  });

  it("keeps the legal footer, unsubscribe placeholder and open pixel", () => {
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("{{{OPEN_PIXEL}}}");
    expect(html).toContain("Últimos lugares"); // hidden inbox preview
  });

  it("is not The Build Log", () => {
    expect(html).not.toContain("The Build Log");
    expect(html).not.toContain("Patrocina");
  });

  it("omits subtitle and CTA when absent", () => {
    const out = renderStandalone({ ...email, subtitle: undefined, cta: undefined });
    expect(out).not.toContain("Build night en CDMX");
    expect(out).not.toContain("Regístrate");
  });

  it("escapes the title", () => {
    expect(renderStandalone({ ...email, title: "<b>x</b>" })).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("renderEmail", () => {
  it("dispatches by kind", () => {
    const issue = emptyIssue("010");
    expect(renderEmail({ kind: "build_log", data: issue })).toBe(renderBuildLog(issue));
    expect(renderEmail({ kind: "standalone", data: email })).toBe(renderStandalone(email));
  });

  it("picks the subject the send uses", () => {
    const issue = { ...emptyIssue("010"), subject: "EN", spanish: { ...emptyIssue("010"), subject: "ES" } };
    expect(emailSubject({ kind: "build_log", data: issue })).toBe("ES");
    expect(emailSubject({ kind: "standalone", data: email })).toBe("Hackathon este sábado");
  });

  it("preview resolves unsubscribe and strips the pixel", () => {
    const out = emailPreviewHtml({ kind: "standalone", data: email });
    expect(out).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(out).not.toContain("{{{OPEN_PIXEL}}}");
  });
});

describe("standaloneWarnings", () => {
  it("flags empty essentials", () => {
    const w = standaloneWarnings({ ...email, subject: "", preview: "", body: "" });
    expect(w).toEqual(expect.arrayContaining([
      "subject está vacío.",
      "preview (texto de inbox) está vacío.",
      "body está vacío.",
    ]));
  });

  it("is quiet for a complete email", () => {
    expect(standaloneWarnings(email)).toEqual([]);
  });
});
