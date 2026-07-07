"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { MobileTOC, StickyTOC } from "@/components/blog/shared";
import type { BlogAuthor } from "@/lib/blog/authors";
import type { BlogPostCredit, BlogPostSource } from "@/lib/blog/posts";

export type PostShellTocItem = [id: string, label: string];

type PostShellProps = {
  title: string;
  description?: string;
  date: string;
  readTime: string;
  tocItems?: PostShellTocItem[];
  author?: BlogAuthor | null;
  cover?: string;
  coverCredit?: BlogPostCredit;
  source?: BlogPostSource;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};

export default function PostShell({
  title,
  description,
  date,
  readTime,
  tocItems = [],
  author,
  cover,
  coverCredit,
  source,
  backHref = "/blog",
  backLabel = "Blog",
  children,
}: PostShellProps) {
  const hasToc = tocItems.length > 0;

  return (
    <div className="blog-post-shell">
      <Link href={backHref} className="blog-back-link">
        <ArrowLeft aria-hidden="true" />
        {backLabel}
      </Link>

      <header className="blog-post-header">
        {source ? <SourcePill source={source} /> : null}
        <div className="blog-post-meta">
          <span>{date}</span>
          <span>{readTime}</span>
          {author ? <AuthorByline author={author} /> : null}
        </div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </header>

      {cover ? (
        <figure className="blog-cover">
          <Image src={cover} alt={`Portada - ${title}`} width={1200} height={560} priority />
          {coverCredit ? (
            <figcaption>
              Foto:{" "}
              {coverCredit.url ? (
                <a href={coverCredit.url} target="_blank" rel="noopener noreferrer">
                  {coverCredit.label}
                </a>
              ) : (
                coverCredit.label
              )}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {hasToc ? <MobileTOC items={tocItems} /> : null}

      <div className="blog-post-layout">
        {hasToc ? <StickyTOC items={tocItems} /> : null}
        <article className="post-content">{children}</article>
      </div>
    </div>
  );
}

function AuthorByline({ author }: { author: BlogAuthor }) {
  const content = (
    <span className="blog-author-byline">
      <Image src={author.avatar} alt="" width={48} height={48} />
      <span>{author.name}</span>
    </span>
  );

  if (!author.href) return content;

  return (
    <Link
      href={author.href}
      target={author.href.startsWith("http") ? "_blank" : undefined}
      rel={author.href.startsWith("http") ? "noopener noreferrer" : undefined}
      aria-label={`Perfil de ${author.name}`}
    >
      {content}
    </Link>
  );
}

function SourcePill({ source }: { source: BlogPostSource }) {
  return (
    <Link href={source.url} target="_blank" rel="noopener noreferrer" className="blog-source-pill">
      <span>{source.label}</span>
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}
