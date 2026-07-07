import type { Metadata } from "next";

import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Aviso de privacidad — AI Builders Latam",
  description:
    "Aviso de privacidad de AI Builders Latam para newsletter, eventos y comunidad.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-main">
        <article className="legal-shell">
          <p className="section-label">Documento</p>
          <h1>Aviso de privacidad.</h1>
          <p className="legal-updated">Última actualización: 7 de julio de 2026</p>

          <div className="legal-content">
            <section>
              <h2>Qué datos usamos</h2>
              <p>
                Recopilamos los datos que compartes voluntariamente al suscribirte, registrarte a
                charlas o participar en la comunidad, como nombre, correo, organización, rol e
                intereses relacionados con IA.
              </p>
            </section>
            <section>
              <h2>Para qué los usamos</h2>
              <p>
                Usamos esta información para enviarte el newsletter, administrar eventos, mejorar el
                contenido, medir engagement básico y mantener comunicaciones relevantes de AI
                Builders Latam.
              </p>
            </section>
            <section>
              <h2>Servicios de terceros</h2>
              <p>
                Podemos apoyarnos en proveedores de correo, analítica, formularios, comunidad y
                hosting. Estos proveedores procesan información únicamente para operar esos
                servicios.
              </p>
            </section>
            <section>
              <h2>Tus opciones</h2>
              <p>
                Puedes darte de baja del newsletter desde el enlace incluido en cada correo. Para
                solicitar acceso, corrección o eliminación de tus datos, escríbenos a{" "}
                <a href="mailto:hola@aibuilders.mx">hola@aibuilders.mx</a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
      <GlassAura />
    </>
  );
}
