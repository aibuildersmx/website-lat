import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/newsletter/render-markdown";

const S = { p: "P", h2: "H", li: "L", a: "A" };
const md = (s: string) => renderMarkdown(s, S);

describe("renderMarkdown", () => {
  it("splits paragraphs on blank lines and keeps single newlines as <br>", () => {
    expect(md("uno\ndos\n\ntres")).toBe('<p style="P">uno<br>dos</p>\n<p style="P">tres</p>');
  });

  it("renders ## headings", () => {
    expect(md("## Agenda")).toBe('<h2 style="H">Agenda</h2>');
  });

  it("renders - lists", () => {
    expect(md("- a\n- b")).toBe('<ul style="margin:0 0 20px;padding-left:22px;"><li style="L">a</li><li style="L">b</li></ul>');
  });

  it("renders bold, italic and links", () => {
    expect(md("**hola** *mundo* [sitio](https://a.mx/?x=1&y=2)")).toBe(
      '<p style="P"><strong>hola</strong> <em>mundo</em> <a href="https://a.mx/?x=1&amp;y=2" style="A">sitio</a></p>',
    );
  });

  it("allows mailto links", () => {
    expect(md("[escríbenos](mailto:hola@aibuilders.mx)")).toContain('href="mailto:hola@aibuilders.mx"');
  });

  it("escapes raw HTML", () => {
    expect(md("<script>alert(1)</script>")).toBe('<p style="P">&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it("leaves unsafe link schemes as literal text", () => {
    const out = md("[x](javascript:alert(1))");
    expect(out).not.toContain("<a ");
    expect(out).toContain("[x](javascript:alert(1))");
  });

  it("cannot break out of href with quotes", () => {
    const out = md('[x](https://a.mx/"onmouseover="alert(1))');
    expect(out).not.toMatch(/href="[^"]*"onmouseover/);
  });

  it("leaves unmatched markers literal", () => {
    expect(md("**sin cerrar")).toBe('<p style="P">**sin cerrar</p>');
  });

  it("returns empty string for blank input", () => {
    expect(md("  \n\n ")).toBe("");
  });

  it("never rewrites emphasis inside a link's URL", () => {
    expect(md("[x](https://a.com/*a*)")).toContain('href="https://a.com/*a*"');
    const out = md("[x](https://a.com/*) foo*");
    expect(out).toContain('href="https://a.com/*"');
    expect(out).not.toContain("<em>");
  });

  it("keeps balanced parentheses in URLs (Wikipedia style)", () => {
    expect(md("[IA](https://es.wikipedia.org/wiki/Mercurio_(planeta))")).toContain(
      'href="https://es.wikipedia.org/wiki/Mercurio_(planeta)"',
    );
  });

  it("escapes apostrophes in URLs so link tracking still wraps them", () => {
    expect(md("[x](https://a.com/it's)")).toContain('href="https://a.com/it&#39;s"');
  });

  it("ignores placeholder-looking control characters in author text", () => {
    expect(md("a \u00000\u0000 b")).toBe('<p style="P">a 0 b</p>');
  });
});
