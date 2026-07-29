import { describe, expect, it } from "vitest";
import { emptyIssue } from "@/lib/newsletter/issue";
import { issueWarnings, previewHtml } from "@/lib/newsletter/preview";

describe("previewHtml", () => {
  it("renders HTML with the unsubscribe placeholder resolved", () => {
    const html = previewHtml(emptyIssue("010"));
    expect(html).toContain("<!doctype html>");
    expect(html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("renders the spanish variant when present, like the real send", () => {
    const issue = {
      ...emptyIssue("010"),
      subject: "English subject",
      spanish: { ...emptyIssue("010"), title: "Título en español único XYZ" },
    };
    expect(previewHtml(issue)).toContain("Título en español único XYZ");
  });
});

describe("issueWarnings", () => {
  it("warns about the missing spanish variant and empty sections", () => {
    const warnings = issueWarnings(emptyIssue("010"));
    expect(warnings).toContain("Sin versión en español: se genera en el composer antes de enviar.");
    expect(warnings).toContain("stories está vacío.");
    expect(warnings).toContain("useCases está vacío.");
    expect(warnings).toContain("events está vacío.");
    expect(warnings).toContain("jobs está vacío.");
    expect(warnings).toContain("essay.linkHref está vacío.");
  });

  it("warns about empty hrefs by index and long subjects", () => {
    const issue = {
      ...emptyIssue("010"),
      subject: "x".repeat(151),
      stories: [
        { eyebrow: "01", title: "Con link", href: "https://ok.dev", body: "b" },
        { eyebrow: "02", title: "Sin link", href: "", body: "b" },
      ],
    };
    const warnings = issueWarnings(issue);
    expect(warnings).toContain("stories[1].href está vacío (el título no tendrá link).");
    expect(warnings).toContain("subject tiene 151 caracteres; el inbox trunca arriba de ~150.");
    expect(warnings).not.toContain("stories[0].href está vacío (el título no tendrá link).");
    expect(warnings).not.toContain("stories está vacío.");
  });

  it("evaluates the variant that would be sent", () => {
    const spanish = { ...emptyIssue("010"), preview: "" };
    const issue = { ...emptyIssue("010"), spanish };
    expect(issueWarnings(issue)).toContain("preview (texto de inbox) está vacío.");
  });

  it("returns section warnings only, not spanish, for a complete issue", () => {
    const complete = {
      ...emptyIssue("010"),
      stories: [{ eyebrow: "01", title: "T", href: "https://x.dev", body: "b" }],
      useCases: [{ icon: "⌁", title: "T", body: "b" }],
      events: [{ day: "18", month: "Jun", label: "VIRTUAL", title: "T", body: "b", href: "https://x.dev" }],
      jobs: [{ label: "Contratando", title: "T", meta: "Remoto", href: "https://x.dev" }],
      essay: { ...emptyIssue("010").essay, linkHref: "https://x.dev" },
    };
    const warnings = issueWarnings(complete);
    expect(warnings).toEqual(["Sin versión en español: se genera en el composer antes de enviar."]);
  });
});
