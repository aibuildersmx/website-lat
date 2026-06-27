import type { Issue } from "@/lib/newsletter/types";

// Realistic sample issue (was The Build Log 002). Lives here as a test fixture
// now that the CLI was retired; doubles as reference content for seeding the
// first draft in the panel.
const issue: Issue = {
  slug: "002",
  subject: "The Build Log · Issue 002 — Cada agente cuesta",
  preview: "Lo que importa esta semana para builders de IA en México. Sin paja, sin hype.",
  issueLabel: "Issue 002",
  date: "31 May 2026",
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
    linkHref: "https://techcrunch.com/2026/05/30/with-microsofts-github-copilot-shifting-to-token-usage-billing-many-developers-bemoan-massive-cost-increases/",
  },
  useCases: [
    {
      icon: "⌁",
      title: "Menos complejidad en sistemas multi-agente",
      body: "La pregunta incómoda volvió: ¿cuánta arquitectura mejora el resultado y cuánta solo hace más caro pensar?",
    },
    {
      icon: "□",
      title: "Automatización para modernizar legacy",
      body: "Agentes que ayudan a transformar sistemas viejos, no solo a generar demos nuevas. Tema grande para empresas con deuda técnica real.",
    },
    {
      icon: "⌕",
      title: "Productizar trámites aburridos",
      body: "Automatizar registros, documentos y procesos legales puede ser menos sexy que un chatbot, pero resuelve fricción que sí se paga.",
    },
    {
      icon: "✧",
      title: "Interfaces verticales con IA",
      body: "Productos que preguntan poco, interpretan contexto y devuelven una recomendación accionable para una industria concreta.",
    },
  ],
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

export default issue;
