import { Fragment, type ReactNode } from "react";
import { SectionTitle } from "@/components/blog/shared";
import type { ArticleContent } from "@/lib/blog/article-types";

function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function renderArticleInline(value: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  return value.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      if (href) {
        return <a key={index} href={href} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
      }
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function BodyBlocks({ body }: { body: string }) {
  const blocks = body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return <ul key={index}>{lines.map((line, item) => <li key={item}>{renderArticleInline(line.replace(/^[-*]\s+/, ""))}</li>)}</ul>;
    }
    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return <ol key={index}>{lines.map((line, item) => <li key={item}>{renderArticleInline(line.replace(/^\d+\.\s+/, ""))}</li>)}</ol>;
    }
    if (lines.every((line) => line.startsWith(">"))) {
      return <blockquote key={index}>{lines.map((line, item) => <p key={item}>{renderArticleInline(line.replace(/^>\s?/, ""))}</p>)}</blockquote>;
    }
    return <p key={index}>{lines.map((line, lineIndex) => <Fragment key={lineIndex}>{lineIndex > 0 ? " " : null}{renderArticleInline(line)}</Fragment>)}</p>;
  });
}

export function ArticleBody({ content }: { content: ArticleContent }) {
  return content.sections.map((section) => (
    <Fragment key={section.id}>
      {section.heading ? <SectionTitle id={section.id}>{section.heading}</SectionTitle> : null}
      <BodyBlocks body={section.body} />
    </Fragment>
  ));
}
