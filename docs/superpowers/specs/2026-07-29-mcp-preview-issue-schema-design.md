# Preview MCP + esquema real del `Issue` — Design

**Fecha:** 2026-07-29
**Estado:** Borrador, pendiente de review

## Resumen

Mejorar el pipeline semanal del newsletter sin automatizar el handoff editorial.
Hoy Esteban arma el contenido en Codex usando el MCP de Aiby y entrega **HTML a
mano**; Ben lo reconstruye como `Issue` JSON para subirlo por el MCP de LAT. El
HTML es un paso lossy que existe porque (a) el esquema del `Issue` que publica
el MCP está vacío, (b) la validación falla sin decir por qué, y (c) no hay forma
de ver el render fuera del composer web.

Esta obra agrega una tool de **preview stateless** (`preview_newsletter_issue`),
un **JSON Schema real** del `Issue`, y **validación con errores por campo** — de
modo que el entregable de Esteban pase a ser el `Issue` JSON validado, y ambos
(Esteban y Ben) puedan ver el render real antes de tocar la base de datos.

El filtro editorial de Ben se conserva intacto: la tool nueva no escribe nada, y
publicar/enviar sigue siendo exclusivo del composer web.

## Decisiones (brainstorming)

- **Preview devuelve el HTML en la respuesta de la tool** (no URL firmada, no
  snapshots con TTL). El agente lo guarda en archivo y lo abre en el navegador.
  Cero infraestructura nueva; la tool queda 100% stateless.
- **Sin auto-handoff.** El JSON pasa de humano a humano (Esteban → Ben). No se
  toca `create_newsletter_draft` ni el flujo de publicación.
- **Idioma:** Esteban escribe el issue **base** (spanglish OK). La versión en
  español la genera Ben en el composer (flujo de traducción existente); el envío
  se bloquea sin ella (`lib/actions/newsletter.ts:203`). El preview renderiza
  `issue.spanish ?? issue` — la misma regla que el envío real
  (`lib/newsletter/render.ts:291`). No hay parámetro `variant`.
- **Tokens de preview sin roles nuevos.** Todos los usuarios del sitio son
  `admin` (default y único valor en uso). El token de Esteban lo crea un admin
  (Ben o Ricardo) bajo su propia cuenta y se lo entrega; el scope
  `newsletter:preview` es lo que lo limita, no el rol. `authenticateMcpToken` no
  cambia.
- **El MCP de Aiby (`aibuilders-bot`) no se toca.** De ese lado el flujo semanal
  ya funciona.

## Contexto: el pipeline hoy

```
Aiby MCP → digest estructurado → [Esteban/Codex] → HTML a mano
                                                     ↓ (se pierde la estructura)
             Issue JSON ← [Ben, reconstruye a mano] ← HTML
                   ↓
          LAT MCP create_newsletter_draft → composer → traducción → envío
```

Causas raíz del paso lossy:

1. `newsletterIssueJsonSchema` (`lib/newsletter/validation.ts:151`) es
   `{ type: "object", additionalProperties: true }` — no declara ni un campo.
   Cualquier modelo que llame `create_newsletter_draft` /
   `update_newsletter_draft` adivina las ~40 propiedades de `BaseIssue`.
2. `parseIssue` devuelve `Issue | null`. El MCP responde *"issue does not match
   the newsletter data model"* sin decir qué campo falló.
3. `renderPreview` existe (`lib/actions/newsletter.ts:404`) pero es un server
   action detrás de sesión web — invisible desde Codex.

## Diseño

### 1. JSON Schema real del `Issue`

Reemplazar el stub `newsletterIssueJsonSchema` por un esquema completo derivado
de `lib/newsletter/types.ts`: todas las propiedades de `BaseIssue` (con
`description` por campo tomada de los comentarios del tipo), sub-esquemas para
`Story`, `Essay`, `UseCase`, `ShowcaseProject`, `EventItem`, `Community`,
`JobItem`, `BuildersMexicoLink`, `BuildersMexicoItem`, `SponsorPlacement`, más
`spanish` (BaseIssue opcional) y `spanishTranslationStale`.

Los límites del esquema espejean los de la validación: `maxLength` según
`MAX_SHORT_TEXT` / `MAX_BODY_TEXT`, `maxItems: 100`, patrón de URL
(`^(https?://|mailto:)` o cadena vacía), `required` según los campos no
opcionales de `BaseIssue`, `additionalProperties: false`.

Las tres tools existentes (`create_newsletter_draft`,
`update_newsletter_draft`, y el `inputSchema` de la nueva) lo consumen sin
cambios de plomería — ya referencian la constante.

**Contra el drift** (el esquema sería la tercera representación de la forma,
junto a `types.ts` y los guards): test de contrato en
`tests/mcp/validation.test.ts` con fixtures que recorren cada campo declarado en
el esquema y verifican que `validateIssue` acepta/rechaza en consonancia
(campo requerido faltante → ambos rechazan; campo extra → ambos rechazan; issue
válido completo → ambos aceptan). El drift se vuelve test rojo.

### 2. Validación con errores por ruta

Nueva función en `lib/newsletter/validation.ts`:

```ts
export function validateIssue(value: unknown): { issue: Issue } | { errors: string[] }
```

Reusa los checks existentes pero acumula rutas concretas en lugar de colapsar a
booleano: `stories[2].href: debe ser URL https://, mailto: o cadena vacía`,
`essay.author: falta o excede 2000 caracteres`, `community: clave desconocida
"foo"`. Tope de ~20 errores por respuesta.

`parseIssue` mantiene su firma (`Issue | null`) y delega a `validateIssue` — los
call sites existentes no cambian. Las tools de escritura del MCP pasan a
devolver los errores concretos en su mensaje de `invalid_arguments`.

### 3. Extraer `previewHtml` a módulo puro

Mover `previewHtml` de `lib/actions/newsletter.ts:126` a
`lib/newsletter/preview.ts` (export puro: `renderBuildLog` + reemplazo del
placeholder de unsubscribe + `stripTracking`). `renderPreview` (server action) y
la tool MCP lo comparten. Sigue la separación existente del repo:
`lib/newsletter` puro, `lib/actions` con sesión.

### 4. Tool `preview_newsletter_issue`

```
preview_newsletter_issue({ issue })
  → { valid: true,  html: "<!doctype html>…", warnings: [...] }
  → { valid: false, errors: ["essay.linkHref: …", …] }
```

- **Scope:** `newsletter:preview` (nuevo). No consulta ni escribe la base.
- **Validación:** `validateIssue`. Si falla → `valid: false` + errores, sin HTML.
- **Render:** `previewHtml(issue)` — misma regla `spanish ?? base` que el envío.
- **Warnings** (válido pero sospechoso, no bloquean):
  - `href`/`linkHref` vacíos en stories, essay, projects, events, jobs
  - `subject` > 150 caracteres (el inbox lo trunca)
  - secciones vacías: `stories`, `useCases`, `events`, `jobs` con 0 items
  - `preview` (texto de inbox) vacío
  - sin `spanish` → aviso informativo de que Ben debe generarla antes de enviar
- **Instrucción al agente** en la `description` de la tool: guardar el HTML en
  archivo y abrirlo en el navegador; no repetirlo en el chat (son decenas de KB).
- **Rate limit:** además del límite global por token (120/min en la ruta), tope
  por operación de 20/min vía `withinMcpMutationRateLimit` (renderizar un issue
  de hasta 200 KB no es gratis). Audit log igual que las demás tools.

### 5. Selector de scopes al crear tokens

Hoy `createMcpToken` siempre otorga `DEFAULT_MCP_SCOPES` (read + write). El
formulario de `/admin/mcp` gana un selector con dos presets:

- **Editor completo** — `newsletter:drafts:read` + `newsletter:drafts:write` +
  `newsletter:preview` (default; los tokens de Ben suman preview).
- **Solo preview** — `newsletter:preview` (el token para Esteban).

Los tokens existentes no cambian (sus scopes ya están persistidos por fila).
`tools/list` ya filtra por scope, así que un token solo-preview ve una sola tool.

### 6. Documentación para Esteban

`docs/MCP_PREVIEW.md` (español, mismo estilo que `docs/MCP_NEWSLETTER.md` de
`aibuilders-bot`): cómo conectar el endpoint `/api/mcp` desde Codex con su
token, el workflow semanal (digest de Aiby → armar `Issue` → iterar con
`preview_newsletter_issue` → entregar el JSON a Ben), y el recordatorio de que
el JSON validado es el entregable, no el HTML.

## Flujo resultante

```
Esteban (Codex)                                Ben (Codex/composer)
  │                                               │
  ├─ Aiby MCP: get_weekly_digest                  │
  ├─ arma el Issue base (spanglish)               │
  ├─ LAT MCP: preview_newsletter_issue ──┐        │
  │    ↳ ve el HTML real, corrige, itera ┘        │
  │                                               │
  └────── Issue JSON validado ───────────────────►├─ create_newsletter_draft
                                                  ├─ composer: revisa/edita
                                                  ├─ genera versión en español
                                                  └─ envía
```

## Seguridad

- La tool de preview no lee ni escribe filas — un token solo-preview filtrado no
  expone borradores, suscriptores ni números enviados.
- El check de rol admin en `authenticateMcpToken` no cambia; los tokens siguen
  perteneciendo a cuentas admin. La restricción de Esteban es por scope.
- Publicar/enviar sigue siendo imposible por MCP (sin cambios: las tools de
  escritura solo tocan `status = 'draft'`).
- Límite de body existente (256 KB) cubre el issue de 200 KB máximo.

## Testing

- **Contrato esquema ↔ validación** (nuevo, ver §1).
- **`validateIssue`**: rutas de error correctas para campos faltantes, tipos
  malos, URLs inválidas, claves extra, anidamiento en `spanish`.
- **Tool de preview** (en `tests/mcp/`): issue válido → HTML + warnings; issue
  inválido → errores sin HTML; scope faltante → denegado; rate limit.
- **Regresión**: las tools de escritura devuelven ahora errores por campo (los
  tests existentes de `validation.test.ts` y `protocol.test.ts` se ajustan).

## Fuera de alcance

- Automatizar el handoff Esteban → Ben (el JSON se pasa a mano, a propósito).
- Updates parciales por sección en `update_newsletter_draft`.
- Exponer issues enviados / archivo por MCP.
- Roles de usuario nuevos o cambios al modelo de auth web.
- Cualquier cambio en `aibuilders-bot` (Aiby MCP).
