import { ArticleEditor } from "../components/article-editor";
import type { ArticleRow } from "@/lib/db/schema";

export default function NewArticlePage() {
  const now = new Date();
  const publishedOn = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const article: ArticleRow = {
    id: "new",
    slug: "nuevo-articulo",
    title: "",
    description: "",
    author: "Ben Kim",
    publishedOn,
    readTime: "5 min",
    tags: [],
    content: { sections: [{ id: "introduccion", heading: "", body: "" }] },
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return <ArticleEditor article={article} />;
}
