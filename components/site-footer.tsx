import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="footer-brand">AI Builders Latam</p>
          <p className="footer-copy">
            Un boletín para operadores, fundadores, ingenieros e investigadores que están
            construyendo con IA en Latinoamérica.
          </p>
        </div>
        <nav className="footer-links" aria-label="Enlaces de comunidad">
          <Link href="/newsletters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
            </svg>
            Archivo de newsletters
          </Link>
          <Link href="/talks">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M23 7 16 12l7 5V7Z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            Charlas virtuales
          </Link>
          <a href="https://vacantes.lat" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <path d="M2 13h20" />
            </svg>
            Vacantes
          </a>
          <a href="https://aibuilders.mx" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 0 20" />
              <path d="M12 2a15.3 15.3 0 0 0 0 20" />
            </svg>
            Sitio oficial aibuilders.mx
          </a>
          <a
            href="https://www.linkedin.com/company/aibuildersmexico"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
              <path d="M2 9h4v12H2z" />
              <circle cx="4" cy="4" r="2" />
            </svg>
            AI Builders Mexico en LinkedIn
          </a>
          <a
            href="https://chat.whatsapp.com/E7oCGyITLkX1aqFexJbbHm"
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-4.9a8.4 8.4 0 1 1 16.1-3.8Z" />
              <path d="M8.9 8.3c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c-.2.2-.2.4 0 .7.4.7 1.2 1.6 2.2 2 .3.1.5.1.7-.1l.6-.7c.2-.2.4-.3.7-.2l1.7.8c.3.1.4.3.4.6 0 .6-.4 1.3-1 1.6-.5.3-1.6.4-3.4-.5-2.5-1.2-4.1-3.4-4.4-5.1-.2-1 .1-1.8.5-2.4Z" />
            </svg>
            Comunidad local en WhatsApp
          </a>
        </nav>
      </div>
    </footer>
  );
}
