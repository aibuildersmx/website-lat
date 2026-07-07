import Link from "next/link";
import type { ReactNode } from "react";

type FooterLink = {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
};

type FooterGroup = {
  title: string;
  links: FooterLink[];
};

const footerGroups: FooterGroup[] = [
  {
    title: "Recursos",
    links: [
      {
        href: "/newsletters",
        label: "Newsletters",
        icon: (
          <>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
          </>
        ),
      },
      {
        href: "/blog",
        label: "Blog",
        icon: (
          <>
            <path d="M4 5h16" />
            <path d="M4 12h16" />
            <path d="M4 19h10" />
          </>
        ),
      },
      {
        href: "/talks",
        label: "Charlas virtuales",
        icon: (
          <>
            <path d="M23 7 16 12l7 5V7Z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </>
        ),
      },
      {
        href: "https://vacantes.lat",
        label: "Vacantes",
        external: true,
        icon: (
          <>
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <path d="M2 13h20" />
          </>
        ),
      },
    ],
  },
  {
    title: "México",
    links: [
      {
        href: "https://aibuilders.mx",
        label: "aibuilders.mx",
        external: true,
        icon: (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 0 20" />
            <path d="M12 2a15.3 15.3 0 0 0 0 20" />
          </>
        ),
      },
      {
        href: "https://www.linkedin.com/company/aibuildersmexico",
        label: "LinkedIn",
        external: true,
        icon: (
          <>
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
            <path d="M2 9h4v12H2z" />
            <circle cx="4" cy="4" r="2" />
          </>
        ),
      },
      {
        href: "https://chat.whatsapp.com/E7oCGyITLkX1aqFexJbbHm",
        label: "WhatsApp local",
        external: true,
        icon: (
          <>
            <path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-4.9a8.4 8.4 0 1 1 16.1-3.8Z" />
            <path d="M8.9 8.3c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c-.2.2-.2.4 0 .7.4.7 1.2 1.6 2.2 2 .3.1.5.1.7-.1l.6-.7c.2-.2.4-.3.7-.2l1.7.8c.3.1.4.3.4.6 0 .6-.4 1.3-1 1.6-.5.3-1.6.4-3.4-.5-2.5-1.2-4.1-3.4-4.4-5.1-.2-1 .1-1.8.5-2.4Z" />
          </>
        ),
      },
    ],
  },
  {
    title: "Documentos",
    links: [
      {
        href: "/privacidad",
        label: "Aviso de privacidad",
        icon: (
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </>
        ),
      },
      {
        href: "/terminos",
        label: "Términos de uso",
        icon: (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h5" />
          </>
        ),
      },
      {
        href: "/codigo-de-conducta",
        label: "Código de conducta",
        icon: (
          <>
            <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
            <circle cx="12" cy="7" r="4" />
            <path d="m19 8 2 2 3-4" />
          </>
        ),
      },
    ],
  },
];

function FooterLinkItem({ href, label, icon, external = false }: FooterLink) {
  const content = (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {icon}
      </svg>
      {label}
    </>
  );

  return external ? (
    <a href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href}>{content}</Link>
  );
}

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
        <nav className="footer-links" aria-label="Enlaces del sitio">
          {footerGroups.map((group) => (
            <div className="footer-link-group" key={group.title}>
              <p className="footer-link-title">{group.title}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <FooterLinkItem {...link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}
