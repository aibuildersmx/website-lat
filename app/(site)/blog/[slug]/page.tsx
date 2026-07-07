import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PostShell from "@/components/blog/post-shell";
import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuthor } from "@/lib/blog/authors";
import { formatPostDate, getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const { title, description, cover } = post.meta;
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
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { default: PostMDX } = await import(`@/content/blog/${slug}.mdx`);

  return (
    <>
      <SiteHeader active="blog" />
      <main className="blog-detail-main">
        <PostShell
          title={post.meta.title}
          description={post.meta.description}
          date={formatPostDate(post.meta.date, "es-MX")}
          readTime={post.meta.readTime}
          tocItems={post.meta.tocItems}
          author={getAuthor(post.meta.author)}
          cover={post.meta.cover}
          coverCredit={post.meta.coverCredit}
          source={post.meta.source}
        >
          <PostMDX />
        </PostShell>
      </main>
      <SiteFooter />
      <GlassAura />
    </>
  );
}
