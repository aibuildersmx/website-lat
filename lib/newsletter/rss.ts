import type { PublishedFeedIssue } from "./archive";

const FEED_TITLE = "The Build Log — AI Builders Latam";
const FEED_DESCRIPTION =
  "Las mejores actualizaciones de IA, cada semana, curadas para quienes construyen con IA en Latinoamérica.";
const NEWSLETTER_SITE_URL = "https://aibuilders.lat";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildNewsletterRss(
  issues: PublishedFeedIssue[],
  siteUrl = NEWSLETTER_SITE_URL,
): string {
  const baseUrl = siteUrl.replace(/\/+$/, "");
  const archiveUrl = `${baseUrl}/newsletters`;
  const feedUrl = `${archiveUrl}/rss.xml`;
  const lastBuildDate = issues.find((issue) => issue.sentAt)?.sentAt;

  const items = issues
    .map((issue) => {
      const issueUrl = `${archiveUrl}/${encodeURIComponent(issue.slug)}`;
      const description = issue.preview || issue.subtitle;
      const publicationDate = issue.sentAt
        ? `\n      <pubDate>${issue.sentAt.toUTCString()}</pubDate>`
        : "";

      return `    <item>
      <title>${escapeXml(issue.subject)}</title>
      <link>${escapeXml(issueUrl)}</link>
      <guid isPermaLink="true">${escapeXml(issueUrl)}</guid>
      <description>${escapeXml(description)}</description>${publicationDate}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(archiveUrl)}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>es-MX</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />${
      lastBuildDate ? `\n    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>` : ""
    }
${items}
  </channel>
</rss>`;
}
