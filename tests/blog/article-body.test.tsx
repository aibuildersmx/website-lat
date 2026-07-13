import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleBody, renderArticleInline } from "@/components/blog/article-body";

describe("database article renderer", () => {
  it("renders supported article structure", () => {
    const html = renderToStaticMarkup(
      <ArticleBody content={{ sections: [{
        id: "senales",
        heading: "Señales",
        body: "Un **cambio importante**.\n\n- Una\n- Dos\n\n> Una cita",
      }] }} />,
    );
    expect(html).toContain('id="senales"');
    expect(html).toContain("<strong>cambio importante</strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<blockquote>");
  });

  it("allows web links and refuses executable URLs", () => {
    const safe = renderToStaticMarkup(<>{renderArticleInline("[Comma](https://comma.ai/)")}</>);
    const unsafe = renderToStaticMarkup(<>{renderArticleInline("[Malicioso](javascript:alert(1))")}</>);
    expect(safe).toContain('href="https://comma.ai/"');
    expect(unsafe).not.toContain("href=");
    expect(unsafe).toContain("[Malicioso](javascript:alert(1))");
  });

  it("escapes raw HTML instead of executing it", () => {
    const html = renderToStaticMarkup(<ArticleBody content={{ sections: [{ id: "x", heading: "", body: "<script>alert(1)</script>" }] }} />);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
