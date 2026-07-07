import type { Metadata } from "next";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublishedVirtualTalks } from "@/lib/virtual-talks";

export const metadata: Metadata = {
  title: "Charlas virtuales — AI Builders Latam",
  description: "Charlas virtuales HowIUseAI para la comunidad de AI Builders Latam.",
};

export const dynamic = "force-dynamic";

function talkTimestamp(eventDate: string): number {
  const timestamp = Date.parse(`${eventDate}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isUpcomingTalk(eventDate: string): boolean {
  const eventDay = talkTimestamp(eventDate);
  if (!eventDay) return false;

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return eventDay >= today;
}

function formatTalkDate(eventDate: string): string {
  const timestamp = talkTimestamp(eventDate);
  if (!timestamp) return eventDate;

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(timestamp));
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return `${day} ${month} ${year}`.trim();
}

export default async function Talks() {
  const talks = (await listPublishedVirtualTalks()).toSorted(
    (a, b) => talkTimestamp(b.eventDate) - talkTimestamp(a.eventDate),
  );

  return (
    <>
      <SiteHeader active="talks" />

      <main className="archive-main">
        <section className="archive-hero" aria-labelledby="talks-title">
          <p className="section-label">HowIUseAI</p>
          <h1 id="talks-title">Charlas virtuales.</h1>
          <p className="archive-copy">
            Sesiones online con builders, operadores y equipos que muestran cómo usan IA en flujos
            reales de producto, ingeniería, contenido, automatización y estrategia.
          </p>
          <div className="archive-signup">
            <p>Para mantenerte al día con nuestras charlas virtuales, suscríbete al newsletter.</p>
            <NewsletterSignup className="archive-signup-form" />
          </div>
        </section>

        <section className="newsletter-list" aria-label="Charlas virtuales HowIUseAI">
          {talks.length === 0 ? (
            <article className="archive-card">
              <p className="archive-meta">HowIUseAI</p>
              <h2>Próximamente</h2>
              <p>Las charlas aparecerán aquí cuando estén publicadas desde el dashboard.</p>
              <span className="archive-link is-muted">Próximamente</span>
            </article>
          ) : (
            talks.map((talk, index) => {
              const isUpcoming = isUpcomingTalk(talk.eventDate);
              const cta = isUpcoming ? "Inscríbete" : "";
              const episodeNumber = talks.length - index;

              return (
                <a
                  className={`newsletter-row talks-row${isUpcoming ? " is-upcoming" : ""}`}
                  href={talk.href}
                  key={talk.id}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${talk.title} ${formatTalkDate(talk.eventDate)}${cta ? ` ${cta}` : ""}`}
                >
                  <span className="archive-meta" aria-hidden="true">
                    <span>
                      <span className="talks-row-number">
                        {String(episodeNumber).padStart(2, "0")}
                      </span>
                      <span className="talks-row-title">{talk.title}</span>
                    </span>
                    <span>{cta}</span>
                    <span>{formatTalkDate(talk.eventDate)}</span>
                  </span>
                </a>
              );
            })
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
