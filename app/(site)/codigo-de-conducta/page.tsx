import type { Metadata } from "next";

import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Código de conducta — AI Builders Latam",
  description: "Código de conducta para la comunidad, eventos y espacios de AI Builders Latam.",
};

export default function CodeOfConductPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-main">
        <article className="legal-shell">
          <p className="section-label">Documento</p>
          <h1>Código de conducta.</h1>
          <p className="legal-updated">Última actualización: 7 de julio de 2026</p>

          <div className="legal-content">
            <section>
              <h2>Principio base</h2>
              <p>
                AI Builders Latam existe para aprender, construir y conectar. Esperamos trato
                profesional, curiosidad de buena fe y respeto por personas con distintos niveles de
                experiencia, disciplinas, países y contextos.
              </p>
            </section>
            <section>
              <h2>Conducta esperada</h2>
              <ul>
                <li>Comparte conocimiento de forma clara, honesta y atribuida.</li>
                <li>Da feedback sobre ideas o trabajo, no sobre identidad o estatus.</li>
                <li>Respeta límites de privacidad, grabación, contacto y reclutamiento.</li>
              </ul>
            </section>
            <section>
              <h2>Conducta no aceptada</h2>
              <p>
                No aceptamos acoso, discriminación, spam, doxxing, intimidación, abuso comercial o
                cualquier acción que deteriore la seguridad de la comunidad.
              </p>
            </section>
            <section>
              <h2>Reportes</h2>
              <p>
                Para reportar un problema, escríbenos a{" "}
                <a href="mailto:hola@aibuilders.lat">hola@aibuilders.lat</a>. Revisaremos el caso y
                podremos moderar, remover acceso o tomar otras medidas proporcionales.
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
