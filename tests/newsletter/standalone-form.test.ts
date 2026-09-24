import { describe, expect, it } from "vitest";
import { ctaProblem, formToEmail } from "@/lib/newsletter/standalone-form";
import { validateStandalone } from "@/lib/newsletter/validation";

const base = { slug: "s-abc12345", subject: "S", preview: "P", title: "T", body: "B" };

describe("formToEmail", () => {
  it("drops a CTA whose URL the validator would reject, so the rest still saves", () => {
    const email = formToEmail({ base, subtitle: "", ctaText: "Regístrate", ctaHref: "www.luma.com/x" });
    expect(email.cta).toBeUndefined();
    expect(validateStandalone(email).errors).toBeUndefined();
  });

  it("keeps a valid CTA and trims its URL", () => {
    expect(formToEmail({ base, subtitle: "", ctaText: "Ir", ctaHref: " https://a.mx " }).cta)
      .toEqual({ text: "Ir", href: "https://a.mx" });
  });

  it("drops empty optional fields", () => {
    const email = formToEmail({ base, subtitle: "  ", ctaText: "", ctaHref: "" });
    expect(email).toEqual(base);
  });
});

describe("ctaProblem", () => {
  it("explains half-filled and invalid buttons", () => {
    expect(ctaProblem("Ir", "")).toBe("El botón necesita texto y URL.");
    expect(ctaProblem("Ir", "www.luma.com/x")).toBe("La URL del botón debe empezar con https:// o mailto:.");
    expect(ctaProblem("Ir", "https://a.mx")).toBeNull();
    expect(ctaProblem("", "")).toBeNull();
  });
});
