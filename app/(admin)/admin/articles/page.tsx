import Link from "next/link";
import { listArticlesForAdmin } from "@/lib/actions/articles";

export const dynamic = "force-dynamic";

export default async function ArticlesAdminPage() {
  const articles = await listArticlesForAdmin();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">AI Builders Latam</p>
          <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">Artículos</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ensayos y análisis publicados en el blog.</p>
        </div>
        <Link href="/admin/articles/new" className="rounded-full bg-gray-900 px-5 py-2.5 font-mono text-[11px] font-bold uppercase text-white transition hover:bg-gray-700 dark:bg-white dark:text-black">
            Nuevo artículo
        </Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-neutral-900">
        {articles.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-gray-400">Todavía no hay artículos en el composer.</p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {articles.map((article) => (
              <li key={article.id}>
                <Link href={`/admin/articles/${article.id}`} className="flex items-center justify-between gap-5 p-5 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800 dark:text-gray-100">{article.title || "Sin título"}</p>
                    <p className="mt-1 truncate font-mono text-xs text-gray-400">/blog/{article.slug}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${article.status === "published" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-300"}`}>
                      {article.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                    <p className="mt-2 text-xs text-gray-400">{article.publishedOn}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
