"use client";

import { useEffect, useMemo, useState } from "react";
import { ArticleBody } from "@/components/blog/article-body";
import PostShell from "@/components/blog/post-shell";
import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuthor } from "@/lib/blog/authors";
import { normalizeArticleContent } from "@/lib/blog/article-types";
import { ARTICLE_PREVIEW_MESSAGE, type ArticlePreviewPayload } from "@/lib/blog/article-preview";

const emptyPreview: ArticlePreviewPayload = {
  title: "Título del artículo",
  description: "La descripción y el resumen SEO aparecerán aquí.",
  author: "Ben Kim",
  publishedOn: "",
  readTime: "5 min",
  tags: [],
  content: { sections: [] },
};

function formatPreviewDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Fecha de publicación";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function ArticlePreviewFrame() {
  const [preview, setPreview] = useState(emptyPreview);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== ARTICLE_PREVIEW_MESSAGE) return;
      const incoming = event.data.payload as Partial<ArticlePreviewPayload>;
      setPreview({
        title: typeof incoming.title === "string" && incoming.title.trim() ? incoming.title : emptyPreview.title,
        description: typeof incoming.description === "string" && incoming.description.trim() ? incoming.description : emptyPreview.description,
        author: typeof incoming.author === "string" ? incoming.author : emptyPreview.author,
        publishedOn: typeof incoming.publishedOn === "string" ? incoming.publishedOn : "",
        readTime: typeof incoming.readTime === "string" && incoming.readTime.trim() ? incoming.readTime : "5 min",
        tags: Array.isArray(incoming.tags) ? incoming.tags.filter((tag): tag is string => typeof tag === "string") : [],
        content: normalizeArticleContent(incoming.content),
      });
    }

    window.addEventListener("message", receive);
    window.parent.postMessage({ type: `${ARTICLE_PREVIEW_MESSAGE}-ready` }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  const tocItems = useMemo(
    () => preview.content.sections.filter((section) => section.heading).map((section) => [section.id, section.heading] as [string, string]),
    [preview.content],
  );

  return (
    <>
      <SiteHeader active="blog" />
      <main className="blog-detail-main">
        <PostShell
          title={preview.title}
          description={preview.description}
          date={formatPreviewDate(preview.publishedOn)}
          readTime={preview.readTime}
          tocItems={tocItems}
          author={getAuthor(preview.author)}
        >
          {preview.content.sections.length > 0 ? (
            <ArticleBody content={preview.content} />
          ) : (
            <p>Agrega una sección para comenzar el artículo.</p>
          )}
        </PostShell>
      </main>
      <SiteFooter />
      <GlassAura />
    </>
  );
}
