import type { Metadata } from "next";

import BlogIndex, { type BlogIndexPost } from "@/components/blog/blog-index";
import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatPostDate, getAllPosts } from "@/lib/blog/posts";

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

export default function BlogIndexPage() {
  const posts: BlogIndexPost[] = getAllPosts().map((post) => ({
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
