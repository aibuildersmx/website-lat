import type { Metadata } from "next";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "AI Builders Latam",
  description:
    "Las mejores actualizaciones de IA, cada semana. Curado para personas que construyen con IA en Latinoamérica.",
  icons: { icon: "/favicon.svg" },
};

// The static site references font families by literal name in styles.css
// ("Geist", "Geist Mono", "Instrument Serif"), so we load them via Google Fonts
// link tags exactly as the original <head> did — keeping styles.css untouched.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap";

// Tags `.local-dev` on the html element when served from localhost / file://,
// matching the original inline bootstrap so dev-only affordances still toggle.
const LOCAL_DEV_SCRIPT = `(() => {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
  if (window.location.protocol === "file:" || localHosts.has(window.location.hostname)) {
    document.documentElement.classList.add("local-dev");
  }
})();`;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONTS_HREF} rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: LOCAL_DEV_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
