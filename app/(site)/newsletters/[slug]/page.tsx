import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedIssue } from "@/lib/newsletter/archive";
import { renderBuildLog } from "@/lib/newsletter/render";
import { stripTracking } from "@/lib/newsletter/tracking";
import { NewsletterFrame } from "./newsletter-frame";

type Props = {
  params: Promise<{ slug: string }>;
};

const PUBLIC_NEWSLETTER_CSS = `<style>
  html,
  body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  * {
    box-sizing: border-box;
  }

  body > table {
    width: 100% !important;
  }

  body > table > tbody > tr > td {
    padding-left: 24px !important;
    padding-right: 24px !important;
  }

  body > table > tbody > tr > td > table {
    width: 600px !important;
    max-width: min(600px, 100%) !important;
  }

  td {
    max-width: 100% !important;
  }

  img {
    max-width: 100% !important;
    height: auto !important;
  }

  a,
  p,
  h1,
  h2,
  h3,
  li,
  span {
    overflow-wrap: anywhere;
  }

  @media (max-width: 520px) {
    td[align="center"] {
      padding: 24px 18px 0 !important;
    }

    body > table > tbody > tr > td > table {
      width: 100% !important;
    }

    h1 {
      font-size: 44px !important;
      line-height: 0.98 !important;
    }

    h2 {
      font-size: 28px !important;
    }

    h3 {
      font-size: 21px !important;
    }
  }
</style>`;

function stripPublicEmailFooter(html: string): string {
  return html.replace(
    /\s*<tr><td style="padding:0;"><div style="height:1px;line-height:1px;font-size:1px;background:[^"]+;">&nbsp;<\/div><\/td><\/tr>\s*<tr><td style="padding:32px 0 0;">\s*<p[^>]*>The Build Log es una curaduría semanal[\s\S]*?<\/td><\/tr>/,
    "",
  );
}

function publicNewsletterHtml(html: string): string {
  return stripPublicEmailFooter(stripTracking(html))
    .replace("<head>", `<head><base target="_blank">${PUBLIC_NEWSLETTER_CSS}`)
    .replace("padding:32px 16px 64px;", "padding:32px 16px 0;")
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", "/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getPublishedIssue(slug);

  if (!issue) {
    return {
      title: "Newsletter no encontrado — AI Builders Latam",
    };
  }

  return {
    title: `${issue.data.issueLabel} — The Build Log`,
    description: issue.data.preview || issue.data.subtitle,
  };
}

export default async function NewsletterDetailPage({ params }: Props) {
  const { slug } = await params;
  const issue = await getPublishedIssue(slug);
  if (!issue) notFound();

  const html = publicNewsletterHtml(renderBuildLog(issue.data));

  return (
    <>
      <SiteHeader active="newsletters" />
      <main className="newsletter-detail">
        <NewsletterFrame html={html} title={issue.data.issueLabel} />
      </main>
      <SiteFooter />
    </>
  );
}
