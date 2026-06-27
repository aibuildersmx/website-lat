# The Build Log → nueva casa en `aibuilders-lat`

**Fecha:** 2026-06-27
**Estado:** Aprobado, listo para plan de implementación

## Resumen

Migrar el sistema completo y self-hosted del newsletter **"The Build Log"** desde el
repo `aibuilders` (Next.js 16 full-stack) hacia `aibuilders-lat`, que será su nueva
casa. Hoy `aibuilders-lat` es un sitio estático (HTML/CSS); se convierte a Next.js 16
para alojar la infraestructura completa (DB, envío, cola, tracking, admin) conservando
su diseño actual.

## Decisiones (brainstorming)

- **Alcance:** infra self-hosted completa (no solo cara pública).
- **Stack:** convertir `aibuilders-lat` a Next.js 16 y portar el código existente tal
  cual (máximo reuso, ya está probado). No reskin sobre el repo viejo.
- **Datos:** migrar todo — suscriptores (`contacts`) + ediciones (`newsletter_issues`).
- **Deploy:** Railway (Postgres + web + worker juntos).
- **Admin:** solo newsletter. Sin la sección Comunidad (depende de aiby-bridge, fuera
  de alcance). Sin blog.

## Estado actual de cada repo

### `aibuilders` (origen — Next.js 16)
Sistema de newsletter completo:
- DB Drizzle/Postgres, schema en `lib/db/schema.ts` (8 tablas).
- Envío con Resend, batching, warmup de dominio.
- Cola pg-boss (`lib/queue/boss.ts`) + `worker.ts` (proceso largo).
- Tracking first-party de opens/clicks (no usa el tracking de Resend).
- Panel admin con editor inline de ediciones + panel de engagement.
- Signup público (server action) + componente `NewsletterSignup`.
- Corre en Railway (web + worker, variables compartidas).

### `aibuilders-lat` (destino — estático hoy)
- `index.html`, `newsletters.html` (archivo, hoy placeholder), `talks.html`, `styles.css`.
- Diseño bespoke (glass/serif, Geist + Instrument Serif, animaciones). **Se conserva.**

## Arquitectura objetivo

`aibuilders-lat` pasa a ser una app Next.js 16 con:

### Qué se porta desde `aibuilders` (tal cual)
- **DB:** `lib/db/` (client + schema). Schema **recortado a 6 tablas**:
  `contacts`, `users`, `sessions`, `newsletter_issues`, `newsletter_sends`,
  `newsletter_warmup`, `newsletter_events`. Se **elimina** `community_people`.
  Migraciones Drizzle regeneradas limpias para el schema recortado.
- **Newsletter libs:** `lib/newsletter/*` completo (render, resend, send-batch,
  warmup, tracking, engagement, links, recipients, icons, issue, types, unsubscribe).
- **Cola/worker:** `lib/queue/boss.ts` + `worker.ts` (pg-boss).
- **Auth admin:** `lib/auth/*` + `lib/auth.ts` (password, session, tokens, users).
- **Rutas API/públicas:**
  - click `app/(site)/r/[token]/route.ts`
  - pixel de open `app/(site)/api/newsletter/o/[token]/route.ts`
  - `app/(site)/unsubscribe/route.ts`
  - iconos `app/api/newsletter/icons/[name]/route.ts`
  - server action de suscripción pública (`lib/actions/newsletter.ts`)
- **Admin (solo newsletter):** grupo `(admin)` → login + `/admin/newsletter`
  (lista, editor `[id]`, `issue-editor`, `editable-canvas`, `engagement-panel`,
  `icon-picker`). `admin-shell` recortado (sin Comunidad), `stat-card`, `theme-toggle`.
  Se **omiten** `admin/comunidad/*` y sus dependencias `AIBY_*`.
- **Componentes:** `components/newsletter-signup.tsx`, `components/cta-section.tsx`.
- **Scripts:** `scripts/newsletter/*` (import-issue, seed-build-log, send-local,
  send-warmup, start-warmup, retry-failed, test-send, remove-contact, warmup-nudge)
  + `scripts/auth/seed-admin.ts`.
- **Tests:** `tests/newsletter/*` (vitest) + config.

### Qué NO se trae
- `community_people`, todo `admin/comunidad/*`, `scripts/community/*`, vars `AIBY_*`.
- Blog (`content/blog`, mdx) y sus rutas.

### Páginas públicas (reskin con el diseño actual de `aibuilders-lat`)
Reimplementar en Next.js conservando la estética de `styles.css`:
- **Home** (`/`) — hero + `NewsletterSignup` real (server action → DB).
- **/newsletters** — el archivo deja de ser placeholder: lista las ediciones
  **publicadas** leídas desde `newsletter_issues` (status = sent/published).
- **/talks** — se mantiene.

> Nota: el archivo público que lee ediciones desde la DB es trabajo **nuevo** (en el
> origen `/newsletter` es solo el landing de signup, no había archivo público de
> ediciones renderizado desde DB).

## Modelo de datos (Issue)

`lib/newsletter/types.ts` es la fuente de verdad: `Issue` estructurado (stories,
essay, useCases, events, community, jobs) guardado como JSONB en
`newsletter_issues.data`. Se mantiene sin cambios.

## Migración de datos

Dump del Postgres del repo viejo → carga al Postgres nuevo de Railway:
- **Obligatorio:** `contacts` (suscriptores) + `newsletter_issues` (ediciones).
- **Opcional / si sale fácil:** historial `newsletter_sends` + `newsletter_events`
  (no bloquea el lanzamiento).

## Deploy (Railway)

Un proyecto Railway con **3 servicios**:
1. **Postgres** (pg-boss corre su propio schema `pgboss` aquí).
2. **Web** — `pnpm start`.
3. **Worker** — `pnpm worker` (proceso largo, cron de warmup `*/30 * * * *`).

Variables compartidas (definir una vez, referenciar en web y worker):
`DATABASE_URL`, `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_REPLY_TO`,
`NEXT_PUBLIC_SITE_URL`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`.
Se quitan `AIBY_API_BASE`, `AIBY_API_KEY`.

> **Conexión a Railway:** usar la nueva interfaz SSH **`railway.new`** (Ricardo ya
> está conectado por ahí). Preferir ese flujo para operar los servicios.

## Implementación por fases

1. **Conversión a Next.js + sistema de diseño** — scaffolding Next.js 16, mover
   `styles.css`/assets, reimplementar layout y tokens del diseño actual.
2. **DB + libs newsletter + cola/worker** — portar `lib/db` (schema recortado +
   migraciones), `lib/newsletter`, `lib/queue`, `worker.ts`, `lib/auth`.
3. **Páginas públicas** — home con signup (server action), `/newsletters` desde DB,
   rutas de tracking/unsubscribe/iconos.
4. **Admin** — auth (login/seed), `/admin/newsletter` (editor + envío/warmup +
   engagement), `admin-shell` recortado.
5. **Migración de datos + deploy Railway** — dump/restore de contacts + issues,
   3 servicios en Railway vía `railway.new`, dominio, smoke test de envío.

## Testing

- Mantener vitest. Portar `tests/newsletter/*`.
- Smoke test de envío real con `scripts/newsletter/test-send.ts` antes del primer
  broadcast.
