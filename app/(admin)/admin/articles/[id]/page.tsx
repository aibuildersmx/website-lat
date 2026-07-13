import { notFound } from "next/navigation";
import { getArticleForAdmin } from "@/lib/actions/articles";
import { ArticleEditor } from "../components/article-editor";

export const dynamic = "force-dynamic";

export default async function ArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticleForAdmin(id);
  if (!article) notFound();
  return <ArticleEditor article={article} />;
}
