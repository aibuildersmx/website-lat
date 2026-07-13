import { describe, expect, it } from "vitest";
import {
  outreachPlainText,
  parseOutreachTranslation,
  renderOutreachHtml,
} from "@/lib/outreach/email";

describe("outreach email rendering", () => {
  it("preserves paragraph spacing and renders safe Markdown links", () => {
    const html = renderOutreachHtml(
      "Primer párrafo.\n\n[AI Builders Latam](https://aibuilders.lat)\nSegunda línea.",
    );

    expect(html).toContain("Primer párrafo.");
    expect(html).toContain('href="https://aibuilders.lat/"');
    expect(html).toContain(">AI Builders Latam</a><br>Segunda línea.");
    expect(html.match(/<p style=/g)).toHaveLength(3); // two body paragraphs + opt-out footer
  });

  it("escapes editable HTML instead of executing it", () => {
    const html = renderOutreachHtml('<script>alert("x")</script>');

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("provides a readable plain-text fallback for Markdown links", () => {
    expect(
      outreachPlainText("Reserva aquí: [Patrocinar](https://vacantes.lat/checkout/ad-sponsor)"),
    ).toContain("Reserva aquí: Patrocinar: https://vacantes.lat/checkout/ad-sponsor");
  });

  it("localizes the opt-out copy for translated versions", () => {
    expect(renderOutreachHtml("Hello", "en")).toContain('<html lang="en">');
    expect(outreachPlainText("Hello", "en")).toContain(
      "If you would rather not receive partnership messages",
    );
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
