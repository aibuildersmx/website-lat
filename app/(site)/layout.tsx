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

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONTS_HREF} rel="stylesheet" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
