# Emails standalone + Build Log editable — Design

**Fecha:** 2026-09-24
**Estado:** Borrador, pendiente de review

## Resumen

Esteban necesita mandar emails sueltos a la lista (anuncios, invitaciones) que
no son The Build Log. Hoy no puede: el composer solo conoce el formato Build
Log, el título y subtítulo se pintan como texto fijo
(`editable-canvas.tsx:375`), los encabezados de sección están hardcodeados
(`render.ts:210-228`), y el envío (`send-batch.ts:56`) solo sabe
`renderBuildLog`. Pidió como alternativa una API key de Resend: **no** — se
salta unsubscribe, warmup y tracking, y quema la reputación del dominio.

Esta obra agrega:

1. Un segundo tipo de email, **standalone**, que reutiliza todo el pipeline de
   envío (tandas, warmup, tracking, unsubscribe, envío de prueba).
2. **Build Log editable:** título, subtítulo y encabezados de sección.
3. **Tools MCP** para crear/editar/previsualizar standalone. Enviar sigue
   siendo exclusivo del admin web, con un humano apretando el botón.

## Decisiones (brainstorming)

- **Misma tabla, columna `kind`.** `newsletter_issues.kind text not null
  default 'build_log'` (`'build_log' | 'standalone'`). Así `newsletter_sends`,
  warmup, engagement y tracking funcionan sin cambios (todos cuelgan de
  `issue_id`). Alternativa descartada: tabla nueva — duplica todo el pipeline.
- **MCP solo drafts.** Crear, editar, leer, listar y previsualizar. Nada de
  envío (ni de prueba) vía MCP.
- **Un solo idioma.** Standalone se escribe directo en el idioma final; no
  pasa por el flujo de traducción y el bloqueo de envío sin `spanish`
  (`lib/actions/newsletter.ts`) no aplica a este kind.
- **Fuera del archivo público y RSS.** `archive.ts` y `rss.ts` filtran
  `kind = 'build_log'`.
- **Markdown restringido, sin dependencia nueva.** Renderer propio que escapa
  HTML primero y luego soporta: párrafos, `## encabezado`, `**negritas**`,
  `*itálicas*`, `[texto](https://…)`, listas `- item`. Solo links `http(s)` y
  `mailto:`. Todo lo demás sale como texto literal.

## Modelo

```ts
// lib/newsletter/standalone-types.ts
export interface StandaloneEmail {
  slug: string;        // "s-<8 chars>" — nunca choca con "015"
  subject: string;
  preview: string;     // texto de preview del inbox
  title: string;
  subtitle?: string;
  body: string;        // markdown restringido
  cta?: { text: string; href: string };
}
```

`data` sigue siendo `jsonb`; el tipo del row pasa a `Issue | StandaloneEmail`
discriminado por `kind`. El helper `renderEmail(kind, data)` es la única
puerta de entrada al HTML: la usan send-batch, el envío de prueba, el preview
del admin, la vista de enviados y el MCP.

El número sugerido de issue (`Issue 015`) solo cuenta filas `build_log`.

## Build Log editable

- `title` y `subtitle` pasan a ser inputs en `editable-canvas.tsx` (ya existen
  en `Issue`).
- Labels opcionales nuevos, mismo patrón que `projectsLabel`/`eventsLabel`:
  `storiesLabel` ("Esta semana en IA"), `essayLabel` ("Pensamiento de la
  semana"), `buildersLabel` ("Desde AI Builders México"), `communityLabel`
  ("Comunidad"). Vacío → default actual; issues viejos rinden idéntico.
- Se agregan al JSON Schema del `Issue` y a `validateIssue`.

## Render standalone

`lib/newsletter/render-standalone.ts` → `renderStandalone(email)`. Misma
tipografía, colores y footer legal/unsubscribe que el Build Log (se extraen a
un módulo compartido lo mínimo necesario: constantes de estilo, `esc`, shell
del documento, footer). Sin bloque de sponsor, sin "curaduría semanal".

## Admin

- `/admin/newsletter/new`: selector "Build Log" / "Email suelto".
- Editor standalone: formulario (asunto, preview, título, subtítulo, cuerpo,
  CTA) + iframe con el preview real a la derecha. Mismos botones: "Enviar
  prueba", "Enviar por tandas", "Enviar todo ahora", "Descargar HTML".
- La lista de drafts/enviados muestra una etiqueta del kind.

## MCP

Scopes existentes: `newsletter:drafts:read`, `newsletter:drafts:write`, `newsletter:preview`.

| Tool | Scope | Qué hace |
|---|---|---|
| `create_standalone_email` | write | crea draft standalone, devuelve id/version |
| `update_standalone_email` | write | reemplaza contenido con `expectedVersion` (optimistic, igual que Build Log) |
| `preview_standalone_email` | preview | stateless: valida y devuelve HTML, no toca DB |
| `list_newsletter_drafts` | read | agrega `kind` a cada fila y filtro opcional `kind` |
| `get_newsletter_draft` | read | agrega `kind` |

`update_newsletter_draft` rechaza drafts `standalone` y viceversa (error
claro, no corrupción de datos). Validación con errores por campo, mismo
estilo que `validateIssue`. Todas las llamadas pasan por la auditoría
existente.

## Git

Los 9 commits locales de Ricardo (preview tool + JSON Schema) nunca se
pushearon y divergen de `origin/main` (4 commits de Locke/Ben). Primer paso:
rebase de `feat/standalone-emails` sobre `origin/main`, resolver conflictos,
tests verdes. Push/PR solo con OK de Ricardo.

## Pruebas

- `renderMarkdown`: escape de HTML, links peligrosos (`javascript:`), cada
  construcción soportada.
- `renderStandalone`: snapshot básico, CTA opcional, subtítulo opcional.
- `renderEmail` despacha por kind; send-batch usa el kind del row.
- Build Log: labels vacíos rinden idéntico a hoy; labels custom aparecen.
- MCP: create/update/preview standalone, conflicto de versión, kind cruzado
  rechazado, scopes.
- Archive/RSS excluyen standalone.

## Fuera de alcance

- Envío vía MCP (ni prueba ni lista).
- Traducción de standalone.
- Segmentación de audiencia distinta a la de la lista actual.
- Plantillas guardadas / bloques arbitrarios.
