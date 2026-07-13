import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PostShell from "@/components/blog/post-shell";
import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuthor } from "@/lib/blog/authors";
import { formatPostDate, getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";
import { articleToPostMeta, getPublishedArticleBySlug } from "@/lib/blog/articles";
import { normalizeArticleContent } from "@/lib/blog/article-types";
import { ArticleBody } from "@/components/blog/article-body";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const filePost = getPostBySlug(slug);
  const databaseArticle = filePost ? null : await getPublishedArticleBySlug(slug);
  const meta = filePost?.meta ?? (databaseArticle ? articleToPostMeta(databaseArticle) : null);
  if (!meta) return {};

  const { title, description, cover } = meta;
  return {
    title: `${title} — AI Builders Latam`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const filePost = getPostBySlug(slug);

  if (!filePost) {
    const article = await getPublishedArticleBySlug(slug);
    if (!article) notFound();
    const meta = articleToPostMeta(article);
    return (
      <>
        <SiteHeader active="blog" />
        <main className="blog-detail-main">
          <PostShell
            title={meta.title}
            description={meta.description}
            date={formatPostDate(meta.date, "es-MX")}
            readTime={meta.readTime}
            tocItems={meta.tocItems}
            author={getAuthor(meta.author)}
          >
            <ArticleBody content={normalizeArticleContent(article.content)} />
          </PostShell>
        </main>
        <SiteFooter />
        <GlassAura />
      </>
    );
  }

  const { default: PostMDX } = await import(`@/content/blog/${slug}.mdx`);

  return (
    <>
      <SiteHeader active="blog" />
      <main className="blog-detail-main">
        <PostShell
          title={filePost.meta.title}
          description={filePost.meta.description}
          date={formatPostDate(filePost.meta.date, "es-MX")}
          readTime={filePost.meta.readTime}
          tocItems={filePost.meta.tocItems}
          author={getAuthor(filePost.meta.author)}
          cover={filePost.meta.cover}
          coverCredit={filePost.meta.coverCredit}
          source={filePost.meta.source}
        >
          <PostMDX />
        </PostShell>
      </main>
      <SiteFooter />
      <GlassAura />
    </>
  );
}
