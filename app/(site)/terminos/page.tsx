import type { Metadata } from "next";

import { GlassAura } from "@/components/glass-aura";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Términos de uso — AI Builders Latam",
  description: "Términos de uso del sitio, newsletter, eventos y comunidad de AI Builders Latam.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-main">
        <article className="legal-shell">
          <p className="section-label">Documento</p>
          <h1>Términos de uso.</h1>
          <p className="legal-updated">Última actualización: 7 de julio de 2026</p>

          <div className="legal-content">
            <section>
              <h2>Uso del sitio</h2>
              <p>
                Este sitio, el newsletter y los eventos de AI Builders Latam comparten información,
                recursos y oportunidades para personas que construyen con IA. Al usarlos, aceptas
                hacerlo de forma legal, respetuosa y sin afectar la operación de la comunidad.
              </p>
            </section>
            <section>
              <h2>Contenido</h2>
              <p>
                El contenido se ofrece con fines informativos y educativos. No constituye asesoría
                legal, financiera, laboral o profesional. Puedes compartir enlaces al contenido
                público atribuyendo a AI Builders Latam.
              </p>
            </section>
            <section>
              <h2>Comunidad y eventos</h2>
              <p>
                Podemos moderar, rechazar o retirar participaciones que incumplan estos términos,
                el código de conducta o que afecten la seguridad, reputación o calidad de la
                comunidad.
              </p>
            </section>
            <section>
              <h2>Cambios</h2>
              <p>
                Podemos actualizar estos términos conforme evolucionen el sitio y las iniciativas de
                la comunidad. Para dudas, escríbenos a{" "}
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
