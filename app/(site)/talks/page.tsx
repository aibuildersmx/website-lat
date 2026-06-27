import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Charlas virtuales — AI Builders Latam",
  description: "Archivo de HowIUseAI Virtual Talks para la comunidad de AI Builders Latam.",
};

const TALKS = [
  {
    meta: "Virtual Talk · Producto",
    title: "Cómo equipos de producto usan IA para acelerar discovery",
    body: "Una conversación sobre investigación, síntesis de feedback, prototipos rápidos y decisiones de producto asistidas por modelos.",
  },
  {
    meta: "Virtual Talk · Ingeniería",
    title: "Workflows con agentes para construir y refactorizar software",
    body: "Demos prácticas de cómo convertir contexto, pruebas y revisión en ciclos de desarrollo más claros con herramientas de IA.",
  },
  {
    meta: "Virtual Talk · Operaciones",
    title: "Automatizaciones que sí sobreviven al trabajo diario",
    body: "Casos de uso para reporting, soporte, análisis y operaciones internas sin caer en demos frágiles que nadie mantiene.",
  },
];

export default function Talks() {
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
          {TALKS.map((talk) => (
            <article className="archive-card" key={talk.title}>
              <p className="archive-meta">{talk.meta}</p>
              <h2>{talk.title}</h2>
              <p>{talk.body}</p>
              <span className="archive-link is-muted">Grabación próximamente</span>
            </article>
          ))}
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
