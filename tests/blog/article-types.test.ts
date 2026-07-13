import { describe, expect, it } from "vitest";
import { normalizeArticleContent, slugifyArticle } from "@/lib/blog/article-types";

describe("article composer content", () => {
  it("creates URL-safe Spanish slugs", () => {
    expect(slugifyArticle("  ¿Qué cambió en la IA?  ")).toBe("que-cambio-en-la-ia");
  });

  it("normalizes sections and gives duplicate headings unique anchors", () => {
    expect(normalizeArticleContent({
      sections: [
        { heading: " Primera señal ", body: " Texto " },
        { heading: "Primera señal", body: "Otra" },
        { heading: "", body: "Introducción" },
        null,
      ],
    })).toEqual({
      sections: [
        { id: "primera-senal", heading: "Primera señal", body: "Texto" },
        { id: "primera-senal-2", heading: "Primera señal", body: "Otra" },
        { id: "seccion-3", heading: "", body: "Introducción" },
      ],
    });
  });

  it("drops empty and malformed content", () => {
    expect(normalizeArticleContent({ sections: [{ heading: " ", body: " " }, "bad"] })).toEqual({ sections: [] });
    expect(normalizeArticleContent(null)).toEqual({ sections: [] });
  });
});
