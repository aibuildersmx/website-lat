import { describe, expect, it } from "vitest";
import { emptyIssue } from "@/lib/newsletter/issue";
import { parseIssue, validateIssue } from "@/lib/newsletter/validation";

describe("MCP newsletter runtime validation", () => {
  it("accepts the canonical empty issue", () => {
    expect(parseIssue(emptyIssue("007"))).toEqual(emptyIssue("007"));
  });

  it("accepts the structured Comunidad card used by issue 006", () => {
    const issue = {
      ...emptyIssue("006"),
      community: {
        label: "Golden nugget",
        title: "Ser responsable del código generado exige saber cómo comprobar el resultado.",
        titleSuffix: "",
        body: "La discusión aterrizó en una pregunta útil: ¿qué evidencia necesitas?",
        stats: [
          "Pide cambios pequeños que puedas aislar.",
          "Prueba el comportamiento, no la confianza que inspira el modelo.",
          "Define qué no puede tocar el agente.",
        ],
      },
    };

    expect(parseIssue(issue)).toEqual(issue);
  });

  it("accepts a known ad placement and rejects an unknown one", () => {
    expect(parseIssue({ ...emptyIssue("007"), adPlacement: "after_stories" })?.adPlacement)
      .toBe("after_stories");
    expect(parseIssue({ ...emptyIssue("007"), adPlacement: "middle" })).toBeNull();
  });

  it("rejects unexpected fields and unsafe link protocols", () => {
    expect(parseIssue({ ...emptyIssue("007"), status: "sent" })).toBeNull();
    expect(parseIssue({
      ...emptyIssue("007"),
      stories: [{ eyebrow: "", title: "Unsafe", body: "", href: "javascript:alert(1)" }],
    })).toBeNull();
  });

  it("rejects oversized content", () => {
    expect(parseIssue({ ...emptyIssue("007"), subtitle: "x".repeat(210_000) })).toBeNull();
  });
});

describe("validateIssue error paths", () => {
  it("returns the issue for a valid input", () => {
    const result = validateIssue(emptyIssue("008"));
    expect(result.errors).toBeUndefined();
    expect(result.issue).toEqual(emptyIssue("008"));
  });

  it("names the exact field for a bad URL inside an array", () => {
    const result = validateIssue({
      ...emptyIssue("008"),
      stories: [
        { eyebrow: "01", title: "Ok", href: "https://ok.dev", body: "b" },
        { eyebrow: "02", title: "Bad", href: "javascript:alert(1)", body: "b" },
      ],
    });
    expect(result.issue).toBeUndefined();
    expect(result.errors).toEqual([
      "issue.stories[1].href: debe ser URL https://, mailto: o cadena vacía",
    ]);
  });

  it("reports missing required fields and unknown keys with paths", () => {
    const withoutSubject: Record<string, unknown> = { ...emptyIssue("008") };
    delete withoutSubject.subject;
    const result = validateIssue({ ...withoutSubject, status: "sent" });
    expect(result.errors).toContain("issue: claves desconocidas: status");
    expect(result.errors).toContain("issue.subject: falta o no es string");
  });

  it("reports nested errors inside the spanish variant", () => {
    const spanish = { ...emptyIssue("008"), essay: { ...emptyIssue("008").essay, linkHref: "ftp://x" } };
    delete (spanish as Record<string, unknown>).spanish;
    const result = validateIssue({ ...emptyIssue("008"), spanish });
    expect(result.errors).toEqual([
      "issue.spanish.essay.linkHref: debe ser URL https://, mailto: o cadena vacía",
    ]);
  });

  it("caps output at 20 errors", () => {
    const stories = Array.from({ length: 30 }, () => ({ eyebrow: 1, title: 1, href: 1, body: 1 }));
    const result = validateIssue({ ...emptyIssue("008"), stories });
    expect(result.errors).toHaveLength(20);
  });

  it("rejects oversized payloads with a single clear error", () => {
    const result = validateIssue({ ...emptyIssue("008"), subtitle: "x".repeat(210_000) });
    expect(result.errors).toEqual(["issue: excede 200000 caracteres serializado"]);
  });
});
