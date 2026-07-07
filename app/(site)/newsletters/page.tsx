import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublishedIssues } from "@/lib/newsletter/archive";

export const metadata: Metadata = {
  title: "Ediciones anteriores — AI Builders Latam",
  description:
    "Archivo de ediciones anteriores de The Build Log, el boletín semanal de AI Builders Latam.",
};

// Reads sent issues from the DB on each request.
export const dynamic = "force-dynamic";

function readableArchiveMeta(issue: {
  issueLabel: string;
  date: string;
  readingTime: string;
}) {
  return `${issue.issueLabel} ${issue.date} ${issue.readingTime}`;
}

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
          <div className="archive-signup">
            <NewsletterSignup className="archive-signup-form" />
          </div>
        </section>

        <section className="newsletter-list" aria-label="Ediciones anteriores">
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
              <Link
                href={`/newsletters/${issue.slug}`}
                className="newsletter-row"
                key={issue.slug}
                aria-label={readableArchiveMeta(issue)}
              >
                <span className="archive-meta" aria-hidden="true">
                  <span>{issue.issueLabel}</span>
                  <span>{issue.readingTime}</span>
                  <span>{issue.date}</span>
                </span>
              </Link>
            ))
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
