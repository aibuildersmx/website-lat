import type { ArticleContent } from "@/lib/blog/article-types";

export const ARTICLE_PREVIEW_MESSAGE = "aibl-article-preview";

export type ArticlePreviewPayload = {
  title: string;
  description: string;
  author: string;
  publishedOn: string;
  readTime: string;
  tags: string[];
  content: ArticleContent;
};
