import { describe, expect, it } from "vitest";
import issue002 from "./fixtures/sample-issue";
import {
  mergeSpanishTranslation,
  originalIssue,
  parseTranslationJson,
} from "@/lib/newsletter/translation";

describe("newsletter Spanish translation", () => {
  it("merges translated prose while preserving structure and URLs", () => {
    const source = originalIssue(issue002);
    const candidate = structuredClone(source);
    candidate.subject = "The Build Log: Agentes con costos visibles";
    candidate.stories[0].title = "Título traducido";
    candidate.stories[0].body = "Cuerpo traducido";
    candidate.stories[0].href = "https://malicious.example";

    const translated = mergeSpanishTranslation(source, candidate);
    expect(translated.subject).toBe("The Build Log: Agentes con costos visibles");
    expect(translated.stories[0].title).toBe("Título traducido");
    expect(translated.stories[0].body).toBe("Cuerpo traducido");
    expect(translated.stories[0].href).toBe(source.stories[0].href);
  });

  it("rejects translations that change array structure", () => {
    const source = originalIssue(issue002);
    const candidate = structuredClone(source);
    candidate.stories.pop();
    expect(() => mergeSpanishTranslation(source, candidate)).toThrow(
      "cambió la estructura de historias",
    );
  });

  it("accepts plain JSON and fenced JSON responses", () => {
    expect(parseTranslationJson('{"ok":true}')).toEqual({ ok: true });
    expect(parseTranslationJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });
});
