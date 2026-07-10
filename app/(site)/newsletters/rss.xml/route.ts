import { listPublishedFeedIssues } from "@/lib/newsletter/archive";
import { buildNewsletterRss } from "@/lib/newsletter/rss";

export const dynamic = "force-dynamic";

export async function GET() {
  const issues = await listPublishedFeedIssues();

  return new Response(buildNewsletterRss(issues), {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
