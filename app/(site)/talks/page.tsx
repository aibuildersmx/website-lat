import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { listPublishedVirtualTalks } from "@/lib/virtual-talks";

export const metadata: Metadata = {
  title: "Charlas virtuales — AI Builders Latam",
  description: "Archivo de HowIUseAI Virtual Talks para la comunidad de AI Builders Latam.",
};

export const dynamic = "force-dynamic";

export default async function Talks() {
  const talks = await listPublishedVirtualTalks();

  return (
    <>
      <SiteHeader active="talks" />

      <main className="archive-main">
        <section className="archive-hero" aria-labelledby="talks-title">
          <p className="section-label">HowIUseAI</p>
          <h1 id="talks-title">Virtual talks anteriores.</h1>
          <p className="archive-copy">
            Sesiones online con builders, operadores y equipos que muestran cómo usan IA en flujos
            reales de producto, ingeniería, contenido, automatización y estrategia.
          </p>
        </section>

        <section className="archive-grid" aria-label="HowIUseAI Virtual Talks anteriores">
          {talks.length === 0 ? (
            <article className="archive-card">
              <p className="archive-meta">HowIUseAI</p>
              <h2>Próximamente</h2>
              <p>Las charlas aparecerán aquí cuando estén publicadas desde el dashboard.</p>
              <span className="archive-link is-muted">Próximamente</span>
            </article>
          ) : (
            talks.map((talk) => (
              <article className="archive-card" key={talk.id}>
                <p className="archive-meta">{talk.meta}</p>
                <h2>{talk.title}</h2>
                <p>{talk.body}</p>
                <a className="archive-link" href={talk.href} target="_blank" rel="noreferrer">
                  Ver en Luma
                </a>
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
              Archivo de HowIUseAI Virtual Talks. Aquí se publicarán grabaciones y recursos de cada
              sesión.
            </p>
          </div>
          <nav className="footer-links" aria-label="Enlaces">
            <Link href="/">Home</Link>
            <Link href="/newsletters">Ediciones anteriores</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
