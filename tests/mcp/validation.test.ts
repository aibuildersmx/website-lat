import { describe, expect, it } from "vitest";
import { emptyIssue } from "@/lib/newsletter/issue";
import { parseIssue } from "@/lib/newsletter/validation";

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
