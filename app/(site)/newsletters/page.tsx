import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listPublishedIssues } from "@/lib/newsletter/archive";

export const metadata: Metadata = {
  title: "Ediciones anteriores — AI Builders Latam",
  description:
    "Archivo de ediciones anteriores de The Build Log, el boletín semanal de AI Builders Latam.",
};

// Reads sent issues from the DB on each request.
export const dynamic = "force-dynamic";

export default async function Newsletters() {
  const issues = await listPublishedIssues();

  return (
    <>
      <SiteHeader active="newsletters" />

      <main className="archive-main">
        <section className="archive-hero" aria-labelledby="archive-title">
          <p className="section-label">The Build Log</p>
          <h1 id="archive-title">Archivo de newsletters.</h1>
          <p className="archive-copy">
            Revisa las ediciones anteriores para entender qué cambió en IA, qué señales importaron y
            qué herramientas empezaron a aparecer en el radar de builders en Latinoamérica.
          </p>
        </section>

        <section className="archive-grid" aria-label="Ediciones anteriores">
          {issues.length === 0 ? (
            <article className="archive-card">
              <p className="archive-meta">The Build Log</p>
              <h2>Próximamente</h2>
              <p>
                Las ediciones completas se irán publicando aquí conforme salgan. Suscríbete para
                recibirlas en tu correo.
              </p>
              <span className="archive-link is-muted">Próximamente</span>
            </article>
          ) : (
            issues.map((issue) => (
              <article className="archive-card" key={issue.slug}>
                <p className="archive-meta">
                  {issue.issueLabel} · {issue.date} · {issue.readingTime}
                </p>
                <h2>{issue.title}</h2>
                <p>{issue.subtitle}</p>
              </article>
            ))
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <p className="footer-brand">AI Builders Latam</p>
            <p className="footer-copy">
              Archivo editorial de The Build Log. Las ediciones completas se irán publicando aquí.
            </p>
          </div>
          <nav className="footer-links" aria-label="Enlaces">
            <Link href="/">Home</Link>
            <Link href="/talks">Charlas virtuales HowIUseAI</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
