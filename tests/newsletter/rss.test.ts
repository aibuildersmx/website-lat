import { describe, expect, it } from "vitest";
import { buildNewsletterRss } from "@/lib/newsletter/rss";
import type { PublishedFeedIssue } from "@/lib/newsletter/archive";

const issue: PublishedFeedIssue = {
  slug: "issue & 004",
  subject: 'IA & agentes <esta semana> "especial"',
  preview: "Señales, herramientas & noticias.",
  subtitle: "Resumen alternativo",
  sentAt: new Date("2026-07-08T15:30:00.000Z"),
};

describe("buildNewsletterRss", () => {
  it("produces a valid RSS document with escaped issue data", () => {
    const xml = buildNewsletterRss([issue], "https://example.com/");

    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain(
      '<atom:link href="https://example.com/newsletters/rss.xml" rel="self" type="application/rss+xml" />',
    );
    expect(xml).toContain("<title>IA &amp; agentes &lt;esta semana&gt; &quot;especial&quot;</title>");
    expect(xml).toContain("https://example.com/newsletters/issue%20%26%20004");
    expect(xml).toContain("<description>Señales, herramientas &amp; noticias.</description>");
    expect(xml).toContain("<pubDate>Wed, 08 Jul 2026 15:30:00 GMT</pubDate>");
    expect(xml).toContain("<lastBuildDate>Wed, 08 Jul 2026 15:30:00 GMT</lastBuildDate>");
  });

  it("falls back to the subtitle and omits dates when an issue has no sent date", () => {
    const xml = buildNewsletterRss(
      [{ ...issue, preview: "", sentAt: null }],
      "https://example.com",
    );

    expect(xml).toContain("<description>Resumen alternativo</description>");
    expect(xml).not.toContain("<pubDate>");
    expect(xml).not.toContain("<lastBuildDate>");
  });

  it("uses the .lat canonical domain by default", () => {
    const xml = buildNewsletterRss([issue]);

    expect(xml).toContain("https://aibuilders.lat/newsletters/rss.xml");
    expect(xml).toContain("https://aibuilders.lat/newsletters/issue%20%26%20004");
  });
});
