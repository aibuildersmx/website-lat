"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { normalizeArticleContent, slugifyArticle } from "@/lib/blog/article-types";
import { getPostBySlug } from "@/lib/blog/posts";
import { db } from "@/lib/db/client";
import { articles, type ArticleRow } from "@/lib/db/schema";

export type ArticleActionState = { ok: boolean; message: string };

async function requireAdmin(): Promise<void> {
  if (!(await getUser())) throw new Error("Unauthorized");
}

function clean(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

function parseContent(value: string) {
  try {
    return normalizeArticleContent(JSON.parse(value));
  } catch {
    return normalizeArticleContent(null);
  }
}

function revalidateArticle(slug?: string, id?: string): void {
  revalidatePath("/admin/articles");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  if (id) revalidatePath(`/admin/articles/${id}`);
}

export async function listArticlesForAdmin(): Promise<ArticleRow[]> {
  if (!(await getUser())) return [];
  return db.select().from(articles).orderBy(desc(articles.updatedAt));
}

export async function getArticleForAdmin(id: string): Promise<ArticleRow | null> {
  if (!(await getUser())) return null;
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return article ?? null;
}

export async function saveArticle(
  _previous: ArticleActionState,
  formData: FormData,
): Promise<ArticleActionState> {
  await requireAdmin();
  const id = clean(formData, "id");
  const title = clean(formData, "title").slice(0, 160);
  const slug = slugifyArticle(clean(formData, "slug") || title);
  const description = clean(formData, "description").slice(0, 500);
  const author = clean(formData, "author").slice(0, 80) || "Ben Kim";
  const publishedOn = clean(formData, "publishedOn");
  const readTime = clean(formData, "readTime").slice(0, 24) || "5 min";
  const content = parseContent(clean(formData, "content"));
  const intent = clean(formData, "intent");

  if (!id || !title || !slug || !description || !publishedOn) {
    return { ok: false, message: "Completa título, slug, descripción y fecha." };
  }
  if ((id !== "new" && !/^[0-9a-f-]{36}$/i.test(id)) || !/^\d{4}-\d{2}-\d{2}$/.test(publishedOn)) {
    return { ok: false, message: "El identificador o la fecha no son válidos." };
  }
  if (intent === "publish" && content.sections.length === 0) {
    return { ok: false, message: "Agrega contenido antes de publicar." };
  }
  if (getPostBySlug(slug)) {
    return { ok: false, message: "Ese slug ya pertenece a un artículo del sitio." };
  }

  const tags = parseTags(clean(formData, "tags"));
  if (id === "new") {
    let createdId: string;
    try {
      const status = intent === "publish" ? "published" : "draft";
      const [created] = await db
        .insert(articles)
        .values({
          slug,
          title,
          description,
          author,
          publishedOn,
          readTime,
          tags,
          content,
          status,
          publishedAt: status === "published" ? new Date() : null,
        })
        .returning({ id: articles.id });
      createdId = created.id;
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "23505") {
        return { ok: false, message: "Ese slug ya está en uso." };
      }
      throw error;
    }
    revalidateArticle(slug, createdId);
    redirect(`/admin/articles/${createdId}`);
  }

  const [current] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!current) return { ok: false, message: "No encontramos este artículo." };

  try {
    const nextStatus = intent === "publish" ? "published" : intent === "unpublish" ? "draft" : current.status;
    await db
      .update(articles)
      .set({
        slug,
        title,
        description,
        author,
        publishedOn,
        readTime,
        tags,
        content,
        status: nextStatus,
        publishedAt:
          intent === "publish"
            ? current.publishedAt ?? new Date()
            : intent === "unpublish"
              ? null
              : current.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "23505") {
      return { ok: false, message: "Ese slug ya está en uso." };
    }
    throw error;
  }

  revalidateArticle(current.slug, id);
  revalidateArticle(slug, id);
  const message = intent === "publish"
    ? "Artículo guardado y publicado."
    : intent === "unpublish"
      ? "Artículo guardado como borrador."
      : "Cambios guardados.";
  return { ok: true, message };
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = clean(formData, "id");
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!article) return;
  await db.delete(articles).where(eq(articles.id, id));
  revalidateArticle(article.slug);
  redirect("/admin/articles");
}
