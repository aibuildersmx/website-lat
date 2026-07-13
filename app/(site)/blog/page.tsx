import type { Metadata } from "next";

import BlogIndex, { type BlogIndexPost } from "@/components/blog/blog-index";
import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatPostDate, getAllPosts } from "@/lib/blog/posts";
import { articleToPostMeta, getPublishedArticles } from "@/lib/blog/articles";

export const metadata: Metadata = {
  title: "Blog — AI Builders Latam",
  description:
    "Notas, guías y reflexiones de la comunidad AI Builders: cómo construimos con IA, qué aprendemos y cómo llevamos ideas a producción.",
  openGraph: {
    title: "Blog — AI Builders Latam",
    description:
      "Notas, guías y reflexiones de la comunidad AI Builders: cómo construimos con IA, qué aprendemos y cómo llevamos ideas a producción.",
    type: "website",
  },
};

// Database-authored articles are published at runtime. Keep the index dynamic
// so a deployment whose initial build runs before the migration still shows
// newly published articles immediately afterward.
export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const databasePosts = (await getPublishedArticles()).map(articleToPostMeta);
  const filesystemPosts = getAllPosts();
  const filesystemSlugs = new Set(filesystemPosts.map((post) => post.slug));
  const allPosts = [...filesystemPosts, ...databasePosts.filter((post) => !filesystemSlugs.has(post.slug))]
    .sort((a, b) => b.date.localeCompare(a.date));
  const posts: BlogIndexPost[] = allPosts.map((post) => ({
    ...post,
    formattedDate: formatPostDate(post.date, "es-MX"),
  }));

  return (
    <>
      <SiteHeader active="blog" />
      <BlogIndex posts={posts} />
      <SiteFooter />
      <GlassAura />
    </>
  );
}
