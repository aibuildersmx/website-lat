// One-off seed for the first two "The Build Log" issues, imported from the
// hand-built HTML comps. Issue 001 (last week) ships as a draft; Issue 002
// (today, 08 Jun 2026) is the one we actually send from /admin/newsletter.
//
// Idempotent: upserts by slug, so re-running just refreshes the JSON.
//
//   set -a && . ./.env.local && set +a && pnpm tsx scripts/newsletter/seed-build-log.ts

import { eq } from "drizzle-orm";
import type { Issue } from "../../lib/newsletter/types";
import { emptyIssue } from "../../lib/newsletter/issue";

// Issue 001 — published last week (draft, archived). Full 5 sections w/ essay.
const issue001: Issue = {
  ...emptyIssue("001"),
  subject: "The Build Log 001 · Copilot cobra por tokens, agentes open source y video",
  preview: "Lo que importa esta semana para builders de IA en México. Sin paja, sin hype.",
  issueLabel: "Issue 001",
  date: "01 Jun 2026",
  readingTime: "6 min de lectura",
  title: "The Build Log",
  subtitle:
    "Lo que importa esta semana para builders de IA en México. Sin paja, sin hype. Solo lo que cambia cómo construyes.",
  stories: [
    {
      eyebrow: "01 · Desarrollo",
      title: "Copilot cambió a cobro por tokens: se acabó la barra libre de agentes",
      href: "https://techcrunch.com/2026/05/30/with-microsofts-github-copilot-shifting-to-token-usage-billing-many-developers-bemoan-massive-cost-increases/",
      body: "Por qué importa: para builders principiantes, esta es la lección de la semana: cada agente cuesta. Antes de automatizar todo, mide pasos, contexto y llamadas. El producto no puede depender de una factura sorpresa.",
    },
    {
      eyebrow: "02 · Open source",
      title: "Hermes Agent viene con ruido: la comunidad está mirando agentes open source",
      href: "https://x.com/NousResearch/status/2061097994531869153",
      body: "Por qué importa: AIBY también estuvo hablando de Hermes, Claude Code y flujos con agentes. La oportunidad no es perseguir hype; es entender qué tareas reales conviene delegar y cuáles siguen siendo flujo manual.",
    },
    {
      eyebrow: "03 · Video",
      title: "Grok Video 1.5 entra fuerte en generación de video",
      href: "https://x.com/ai_for_success/status/2061141485865820403",
      body: "Por qué importa: video sigue bajando de dificultad. Si estás validando una idea, ya no necesitas esperar a producción: puedes probar historia, demo, anuncio y tono en horas.",
    },
  ],
  essay: {
    eyebrow: "Ensayo · 3 min de lectura",
    title: "Más agentes no siempre significa más inteligencia.",
    body: "La comunidad lo dijo sin adornos: meter 8 agentes, 156 skills y 72 comandos puede sonar poderoso, pero también puede quemar tokens, contexto y foco. El builder maduro no colecciona agentes. Diseña sistemas que saben cuándo no hacer nada.",
    author: "Javier Rivero",
    authorRole: "Cofundador · AI Builders México",
    linkText: "Leer ensayo",
    linkHref:
      "https://techcrunch.com/2026/05/30/with-microsofts-github-copilot-shifting-to-token-usage-billing-many-developers-bemoan-massive-cost-increases/",
  },
  useCases: [
    {
      icon: "tree-structure",
      title: "Menos complejidad en sistemas multi-agente",
      body: "La pregunta incómoda volvió: ¿cuánta arquitectura mejora el resultado y cuánta solo hace más caro pensar?",
    },
    {
      icon: "gear",
      title: "Automatización para modernizar legacy",
      body: "Agentes que ayudan a transformar sistemas viejos, no solo a generar demos nuevas. Tema grande para empresas con deuda técnica real.",
    },
    {
      icon: "stamp",
      title: "Productizar trámites aburridos",
      body: "Automatizar registros, documentos y procesos legales puede ser menos sexy que un chatbot, pero resuelve fricción que sí se paga.",
    },
    {
      icon: "squares-four",
      title: "Interfaces verticales con IA",
      body: "Productos que preguntan poco, interpretan contexto y devuelven una recomendación accionable para una industria concreta.",
    },
  ],
  eventsLabel: "Próximos eventos",
  events: [
    {
      day: "18",
      month: "Jun",
      label: "AIBM · Online",
      title: "How I Use AI #7: WhatsApp Voicebots",
      body: "Demo práctica para builders que quieren entender cómo se diseñan agentes de voz y flujos útiles en WhatsApp.",
      href: "https://www.aibuilders.mx/designwithai",
    },
    {
      day: "24",
      month: "Jun",
      label: "Café Compute · CDMX",
      title: "Meetup para builders de IA",
      body: "Conversaciones chicas, demos reales y gente construyendo sin convertir cada idea en pitch deck.",
      href: "https://luma.com/cafecomputecdmx",
    },
  ],
  community: {
    label: "Resumen de la semana",
    title: "Automatización",
    titleSuffix: "· herramientas dev · Claude Code · Hermes Agent · product management",
    body: "La conversación se movió hacia lo práctico: menos “qué modelo es mejor” y más “cómo diseño un flujo que funcione, cueste poco y pueda repetirse”.",
    stats: [
      "Automatización fue el tema más repetido de la semana.",
      "Claude Code y herramientas de desarrollo siguieron subiendo.",
      "Hermes Agent prendió curiosidad por agentes open source.",
    ],
  },
  jobs: [
    {
      label: "Contratando",
      title: "Desarrollador de automatizaciones con n8n",
      meta: "Freelance · remoto LatAm · 4 a 6 meses",
      href: "https://forms.gle/f37hLgyBo9fyoNU78",
    },
  ],
};

// Issue 002 — sent today (08 Jun 2026). No essay; the "Proyectos de la
// comunidad" section reuses the events container via `eventsLabel`.
const issue002: Issue = {
  ...emptyIssue("002"),
  subject: "The Build Log 002 · OpenAI llega a AWS, agentes que sí sirven y Sites",
  preview: "Lo que importa esta semana para builders de IA en México. Sin paja, sin hype.",
  issueLabel: "Issue 002",
  date: "08 Jun 2026",
  readingTime: "5 min de lectura",
  title: "The Build Log",
  subtitle:
    "Lo que importa esta semana para builders de IA en México. Sin paja, sin hype. Solo lo que cambia cómo construyes.",
  stories: [
    {
      eyebrow: "01 · OpenAI × AWS",
      title: "OpenAI y Codex ya están en Amazon Bedrock",
      href: "https://openai.com/index/openai-frontier-models-and-codex-are-now-available-on-aws/",
      body: "Por qué importa: si construyes para empresas que viven en AWS, ahora puedes venderles OpenAI con menos fricción de compliance, procurement y arquitectura. El stack “serio” de agentes se está acercando al builder común.",
    },
    {
      eyebrow: "02 · Microsoft Build",
      title: "Microsoft convirtió “agentes” en infraestructura de trabajo",
      href: "https://blogs.microsoft.com/blog/2026/06/02/microsoft-build-2026-be-yourself-at-work/",
      body: "Por qué importa: Microsoft IQ y su Agent Platform apuntan a lo mismo: agentes con contexto real de empresa, no demos aisladas. Para builders, la oportunidad se mueve hacia workflows que viven dentro de herramientas existentes.",
    },
    {
      eyebrow: "03 · Builder tools",
      title: "OpenAI mostró Sites: páginas web interactivas desde ChatGPT",
      href: "https://x.com/OpenAI/status/2061845949170045346",
      body: "Por qué importa: el salto no es “hacer una landing más rápido”. Es poder convertir una conversación, un spec o una demo en una superficie usable. Para principiantes, esto baja el costo de probar ideas completas.",
    },
  ],
  // No essay this issue — left blank so the renderer skips the section entirely.
  essay: { ...emptyIssue("002").essay, title: "" },
  useCases: [
    {
      icon: "desktop",
      title: "Computer use para tareas reales",
      body: "La conversación se puso práctica: limpiar correos, mover pantallas, editar video y delegar tareas de escritorio sin convertirlo todo en SaaS.",
    },
    {
      icon: "repeat",
      title: "Loops y sequences antes que “más agentes”",
      body: "Rashid lo resumió bien: el siguiente salto no siempre es un agente autónomo; a veces es un loop más claro, medible y fácil de depurar.",
    },
    {
      icon: "package",
      title: "Context delivery para equipos",
      body: "Driftless, Recuerd0 y Fragua atacan el mismo dolor: que los agentes no rompan decisiones del equipo porque “olvidaron” el contexto.",
    },
    {
      icon: "coins",
      title: "Costos de suscripción bajo lupa",
      body: "El tema subió fuerte: quién paga Claude, Codex, Cursor y tokens cuando el uso deja de ser hobby y se vuelve operación diaria.",
    },
  ],
  eventsLabel: "Proyectos de la comunidad",
  events: [
    {
      day: "05",
      month: "Jun",
      label: "Mario Chávez · Harness",
      title: "Fragua: agentes para construir Rails con control de costos",
      body: "Un harness para apps Rails greenfield o brownfield con orquestación, observabilidad y costos visibles. Beta privada.",
      href: "https://fragua.app/",
    },
    {
      day: "04",
      month: "Jun",
      label: "Adrian Najera · Open source",
      title: "Yoru: lenguaje pensado para sistemas con agentes",
      body: "Herramientas, agentes, servidores MCP, actores supervisados y pipelines ETL como construcciones nativas del lenguaje.",
      href: "https://adriangitvitz.github.io/yoru-lang/",
    },
    {
      day: "06",
      month: "Jun",
      label: "J · Claude Code",
      title: "Short Story Skill para cuentos al estilo Piglia",
      body: "Un skill bilingüe que convierte teoría narrativa latinoamericana en una herramienta creativa reutilizable.",
      href: "https://github.com/JaimeOrtegaxyz/short-story",
    },
  ],
  community: {
    label: "Resumen de la semana",
    title: "Herramientas dev",
    titleSuffix: "· infraestructura IA · costos · open source · Codex",
    body: "La conversación no fue de “hype”; fue de stack, costos, contexto y herramientas para que los agentes trabajen sin destruir tu operación.",
    stats: [
      "Herramientas de desarrollo fue el tema más repetido.",
      "Costos de suscripciones subió fuerte: de 1 a 5 menciones.",
      "Open source, Codex y modelos locales ganaron terreno.",
    ],
  },
  jobs: [
    {
      label: "Link que vale guardar",
      title: "Driftless: contexto crítico antes de editar código",
      meta: "Para equipos que ya sienten que sus agentes avanzan rápido, pero el lead o CTO pierde el mapa de decisiones.",
      href: "https://driftless.icu",
    },
  ],
};

async function upsert(issue: Issue) {
  const { db } = await import("../../lib/db/client");
  const { newsletterIssues } = await import("../../lib/db/schema");

  const existing = await db
    .select({ id: newsletterIssues.id, status: newsletterIssues.status })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.slug, issue.slug))
    .limit(1);

  if (existing[0]) {
    if (existing[0].status === "sent") {
      console.log(`! Issue ${issue.slug} ya fue ENVIADO — no lo toco.`);
      return;
    }
    await db
      .update(newsletterIssues)
      .set({ data: issue, subject: issue.subject, updatedAt: new Date() })
      .where(eq(newsletterIssues.id, existing[0].id));
    console.log(`↻ Issue ${issue.slug} actualizado (${existing[0].id}).`);
  } else {
    const inserted = await db
      .insert(newsletterIssues)
      .values({ slug: issue.slug, subject: issue.subject, status: "draft", data: issue })
      .returning({ id: newsletterIssues.id });
    console.log(`＋ Issue ${issue.slug} creado (${inserted[0].id}).`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL no está set. Corre: set -a && . ./.env.local && set +a");
    process.exit(1);
  }
  await upsert(issue001);
  await upsert(issue002);
  console.log("Listo. Revisa /admin/newsletter.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
