import type { Metadata } from "next";
import "../globals.css";
import { Analytics } from "@vercel/analytics/next";
import { siteFontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "AI Builders Latam",
  description:
    "Las mejores actualizaciones de IA, cada semana. Curado para personas que construyen con IA en Latinoamérica.",
  icons: { icon: "/favicon.svg" },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={siteFontVariables}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
