import { describe, expect, it } from "vitest";
import {
  DEFAULT_OUTREACH_BODY,
  outreachPlainText,
  parseOutreachTranslation,
} from "@/lib/outreach/email";

describe("default outreach copy", () => {
  it("uses the current sponsorship offer", () => {
    expect(DEFAULT_OUTREACH_BODY).toContain(
      "[AI Builders Latam](https://aibuilders.lat)",
    );
    expect(DEFAULT_OUTREACH_BODY).toContain("2,404+ desarrolladores y fundadores técnicos");
    expect(DEFAULT_OUTREACH_BODY).toContain("$2,000 USD por espacio");
    expect(DEFAULT_OUTREACH_BODY).toContain("los lugares son limitados");
    expect(DEFAULT_OUTREACH_BODY).toContain("Saludos,\nBen");
    expect(DEFAULT_OUTREACH_BODY).not.toContain("$2,000 MXN");
  });
});

describe("outreach plain-text rendering", () => {
  it("preserves paragraph spacing and expands Markdown links", () => {
    const text = outreachPlainText(
      "Primer párrafo.\n\n[AI Builders Latam](https://aibuilders.lat)\nSegunda línea.",
    );

    expect(text).toBe(
      "Primer párrafo.\n\nAI Builders Latam: https://aibuilders.lat\nSegunda línea.",
    );
  });

  it("provides a readable plain-text fallback for Markdown links", () => {
    expect(
      outreachPlainText("Reserva aquí: [Patrocinar](https://vacantes.lat/checkout/ad-sponsor)"),
    ).toContain("Reserva aquí: Patrocinar: https://vacantes.lat/checkout/ad-sponsor");
  });

  it("leaves ordinary text unchanged", () => {
    expect(outreachPlainText("Hello")).toBe("Hello");
  });
});

describe("outreach translation parsing", () => {
  it("accepts the exact subject and body strings", () => {
    expect(parseOutreachTranslation({ subject: "Hello", body: "Body" })).toEqual({
      subject: "Hello",
      body: "Body",
    });
  });

  it("rejects malformed model output", () => {
    expect(() => parseOutreachTranslation({ subject: "Missing body" })).toThrow(
      "La traducción no contiene asunto y contenido.",
    );
  });
});
