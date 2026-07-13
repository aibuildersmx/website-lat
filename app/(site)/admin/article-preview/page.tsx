import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArticlePreviewFrame } from "@/components/blog/article-preview-frame";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vista previa del artículo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ArticlePreviewPage() {
  if (!(await getUser())) redirect("/login");
  return <ArticlePreviewFrame />;
}
