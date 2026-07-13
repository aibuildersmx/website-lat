import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { articles, type ArticleRow } from "@/lib/db/schema";
import { normalizeArticleContent } from "@/lib/blog/article-types";
import type { BlogPostMeta } from "@/lib/blog/posts";

function isMissingTable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && (error as { code?: string }).code === "42P01") return true;
  const cause = "cause" in error ? (error as { cause?: unknown }).cause : null;
  return Boolean(
    cause &&
      typeof cause === "object" &&
      "code" in cause &&
      (cause as { code?: string }).code === "42P01",
  );
}

export function articleToPostMeta(article: ArticleRow): BlogPostMeta {
  const content = normalizeArticleContent(article.content);
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    date: article.publishedOn,
    readTime: article.readTime,
    tags: article.tags,
    author: article.author,
    tocItems: content.sections
      .filter((section) => section.heading)
      .map((section) => [section.id, section.heading]),
  };
}

export async function getPublishedArticles(): Promise<ArticleRow[]> {
  try {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedOn), desc(articles.createdAt));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

export async function getPublishedArticleBySlug(slug: string): Promise<ArticleRow | null> {
  try {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    return article?.status === "published" ? article : null;
  } catch (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
}
