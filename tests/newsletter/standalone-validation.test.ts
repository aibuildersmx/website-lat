import { describe, expect, it } from "vitest";
import { validateStandalone } from "@/lib/newsletter/validation";
import { emptyStandalone, standaloneSlug } from "@/lib/newsletter/standalone-types";

const valid = {
  ...emptyStandalone("s-abc12345"),
  subject: "Hackathon este sábado",
  title: "Nos vemos el sábado",
  body: "Hola **builders**.",
  cta: { text: "Regístrate", href: "https://aibuilders.mx/eventos" },
};

describe("validateStandalone", () => {
  it("accepts a complete email", () => {
    expect(validateStandalone(valid).email).toEqual(valid);
  });

  it("accepts optional subtitle and cta omitted", () => {
    const withoutCta = { ...valid, cta: undefined };
    delete withoutCta.cta;
    expect(validateStandalone(withoutCta).errors).toBeUndefined();
  });

  it("reports field-level errors", () => {
    const result = validateStandalone({ ...valid, subject: 3, nope: true, cta: { text: "x", href: "javascript:alert(1)" } });
    expect(result.errors).toEqual(expect.arrayContaining([
      "email: claves desconocidas: nope",
      "email.subject: falta o no es string",
      "email.cta.href: debe ser URL https://, mailto: o cadena vacía",
    ]));
  });

  it("requires a non-empty cta href when a cta is present", () => {
    expect(validateStandalone({ ...valid, cta: { text: "Ir", href: "" } }).errors)
      .toContain("email.cta.href: requerido cuando hay CTA");
  });

  it("rejects Build Log shaped input", () => {
    expect(validateStandalone({ ...valid, stories: [] }).errors).toContain("email: claves desconocidas: stories");
  });
});

describe("standaloneSlug", () => {
  it("is never numeric", () => {
    for (let i = 0; i < 50; i++) expect(standaloneSlug()).toMatch(/^s-[a-z0-9]{8}$/);
  });
});
