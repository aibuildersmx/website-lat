/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GlassAura } from "@/components/glass-aura";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { subscriberMetrics } from "@/lib/newsletter/subscriber-metrics";

export const dynamic = "force-dynamic";

const READER_LOGOS = [
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Stripe_Logo,_revised_2016.svg",
    alt: "Stripe",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Uber_logo_2018.svg",
    alt: "Uber",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Amazon_logo.svg",
    alt: "Amazon",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Google_2015_logo.svg",
    alt: "Google",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercado_Libre_wordmark_%28Spanish_version%29.svg",
    alt: "Mercado Libre",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Nubank_logo_2021.svg",
    alt: "Nubank",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Salesforce.com_logo.svg",
    alt: "Salesforce",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Rappi_logo.svg",
    alt: "Rappi",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Globant_Logo.svg",
    alt: "Globant",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_de_Kavak.svg",
    alt: "Kavak",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Zillow_logo.svg",
    alt: "Zillow",
  },
  { src: "/assets/logos/cursor.svg", alt: "Cursor" },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/XAI_Logo.svg",
    alt: "xAI",
  },
  {
    src: "https://commons.wikimedia.org/wiki/Special:Redirect/file/NVIDIA_logo.svg",
    alt: "NVIDIA",
  },
];

export default async function Home() {
  const metrics = await subscriberMetrics();
  const subscriberCount = metrics.currentSubscribers.toLocaleString("es-MX");

  return (
    <>
      <SiteHeader active="home" />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner">
            <div className="brand-lockup" aria-label="AI Builders Latam">
              <span className="brand-name">AI Builders Latam</span>
              <span className="brand-context">The Build Log</span>
            </div>
            <h1 id="hero-title">Las mejores actualizaciones de IA, cada semana.</h1>
            <p className="hero-copy">
              Mantente al día con los cambios que importan en IA y tecnología. Tendencias,
              lanzamientos y oportunidades, curadas en una sola lectura semanal.
            </p>
            {/* Self-hosted signup → `subscribe` server action (writes to contacts). */}
            <NewsletterSignup className="hero-signup" />
            <div className="hero-readers" aria-label="Prueba social">
              <div className="avatar-stack" aria-hidden="true">
                <img className="avatar" src="/assets/avatars/reader-3.webp" alt="" />
                <img
                  className="avatar avatar-soft-ring"
                  src="/assets/avatars/reader-1.webp"
                  alt=""
                />
                <img className="avatar" src="/assets/avatars/reader-4.webp" alt="" />
                <img
                  className="avatar avatar-offset-ring"
                  src="/assets/avatars/reader-2.webp"
                  alt=""
                />
                <span className="avatar-more">+</span>
              </div>
              <p>
                Únete a <strong>{subscriberCount}+ lectores</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="readers-section" aria-labelledby="readers-title">
          <div className="section-wrap readers-wrap">
            <p id="readers-title">Lectores de equipos en</p>
            <div className="reader-marquee">
              <ul className="reader-logos" aria-label="Empresas donde trabajan lectores">
                {READER_LOGOS.map((logo) => (
                  <li key={logo.alt}>
                    <img src={logo.src} alt={logo.alt} />
                  </li>
                ))}
              </ul>
              <ul className="reader-logos" aria-hidden="true">
                {READER_LOGOS.map((logo) => (
                  <li key={`dup-${logo.alt}`}>
                    <img src={logo.src} alt="" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="value-section" aria-label="Que incluye">
          <div className="section-wrap value-grid">
            <article className="value-card">
              <span className="value-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                  <path d="M8 7h8" />
                  <path d="M8 11h8" />
                </svg>
              </span>
              <h2>Lo que cambió</h2>
              <p>
                Los lanzamientos, modelos y movimientos de IA que vale la pena tener en el radar.
              </p>
            </article>

            <article className="value-card">
              <span className="value-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <h2>Por qué importa</h2>
              <p>
                Contexto claro para entender qué es hype, qué cambia el mercado y qué puede esperar.
              </p>
            </article>

            <article className="value-card">
              <span className="value-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  <path d="M2 13h20" />
                </svg>
              </span>
              <h2>Qué seguir después</h2>
              <p>
                Herramientas, lecturas y oportunidades para no quedarte atrás en IA y tecnología.
              </p>
            </article>
          </div>
        </section>

        <section className="ecosystem-section" aria-labelledby="ecosystem-title">
          <div className="section-wrap ecosystem-layout">
            <div className="ecosystem-intro">
              <p className="section-label">Más que un newsletter</p>
              <h2 id="ecosystem-title">De señal a acción.</h2>
              <p>
                AI Builders Latam conecta lectura, conversaciones y oportunidades para que no solo
                sigas la ola de IA: puedas construir, aprender y moverte con ella.
              </p>
            </div>

            <div className="ecosystem-grid" aria-label="Recursos de AI Builders Latam">
              <article className="ecosystem-card">
                <div className="ecosystem-card-top">
                  <span className="ecosystem-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 6h16" />
                      <path d="M4 12h16" />
                      <path d="M4 18h10" />
                    </svg>
                  </span>
                  <p className="ecosystem-kicker">Blog</p>
                </div>
                <h3>Guías y criterio para construir mejor.</h3>
                <p>
                  Lee notas prácticas sobre agentes, flujos de trabajo, herramientas y aprendizajes
                  reales de la comunidad.
                </p>
                <Link className="ecosystem-cta" href="/blog">
                  Leer el blog
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </Link>
              </article>

              <article className="ecosystem-card">
                <div className="ecosystem-card-top">
                  <span className="ecosystem-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M23 7 16 12l7 5V7Z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                  </span>
                  <p className="ecosystem-kicker">Charlas</p>
                </div>
                <h3>Charlas virtuales con builders de IA.</h3>
                <p>
                  Únete a sesiones online con builders de producto, ingeniería, automatización,
                  contenido y estrategia.
                </p>
                <Link className="ecosystem-cta" href="/talks">
                  Ver charlas
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </Link>
              </article>

              <article className="ecosystem-card">
                <div className="ecosystem-card-top">
                  <span className="ecosystem-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <rect x="2" y="7" width="20" height="14" rx="2" />
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                      <path d="M2 13h20" />
                    </svg>
                  </span>
                  <p className="ecosystem-kicker">Vacantes</p>
                </div>
                <h3>Oportunidades para trabajar en Latinoamérica.</h3>
                <p>
                  Encuentra roles remotos, híbridos y presenciales en equipos que están
                  construyendo desde la región.
                </p>
                <a className="ecosystem-cta" href="https://vacantes.lat" target="_blank" rel="noreferrer">
                  Explorar vacantes
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </a>
              </article>
            </div>
          </div>
        </section>

        <section className="local-section" aria-labelledby="local-title">
          <div className="local-card">
            <h2 id="local-title">¿Estás en México?</h2>
            <p>Únete a la comunidad de IA #1 en México.</p>
            <div className="community-actions" aria-label="Canales de AI Builders Mexico">
              <a
                className="secondary-button"
                href="https://aibuilders.mx"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 0 20" />
                  <path d="M12 2a15.3 15.3 0 0 0 0 20" />
                </svg>
                Visitar aibuilders.mx
              </a>
              <a
                className="secondary-button secondary-button-light"
                href="https://www.linkedin.com/company/aibuildersmexico"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
                  <path d="M2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                Seguir en LinkedIn
              </a>
              <a
                className="secondary-button secondary-button-light"
                href="https://chat.whatsapp.com/E7oCGyITLkX1aqFexJbbHm"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-4.9a8.4 8.4 0 1 1 16.1-3.8Z" />
                  <path d="M8.9 8.3c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c-.2.2-.2.4 0 .7.4.7 1.2 1.6 2.2 2 .3.1.5.1.7-.1l.6-.7c.2-.2.4-.3.7-.2l1.7.8c.3.1.4.3.4.6 0 .6-.4 1.3-1 1.6-.5.3-1.6.4-3.4-.5-2.5-1.2-4.1-3.4-4.4-5.1-.2-1 .1-1.8.5-2.4Z" />
                </svg>
                Unirme a WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <GlassAura />
    </>
  );
}
