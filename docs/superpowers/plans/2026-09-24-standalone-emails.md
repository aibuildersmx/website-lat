# Emails standalone + Build Log editable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Esteban puede armar y mandar emails sueltos (no-Build Log) desde el admin o crearlos vía MCP, y el Build Log deja de tener título/subtítulo/encabezados hardcodeados.

**Architecture:** Columna `kind` (`build_log` | `standalone`) en `newsletter_issues`; el JSON en `data` cambia de forma según el kind. Un único despachador `renderEmail(kind, data)` alimenta send-batch, envío de prueba, previews y MCP, así que tandas/warmup/tracking/unsubscribe no cambian. Standalone vive en módulos propios (`standalone-*.ts`); el Build Log solo gana campos opcionales.

**Tech Stack:** Next.js 16 (app router, server actions), Drizzle + Postgres, pg-boss worker, Resend, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-24-standalone-emails-design.md`

## Global Constraints

- El MCP **nunca** envía (ni prueba ni lista). Ningún nombre de tool contiene `send|publish|delete|translate` (lo asegura `tests/mcp/protocol.test.ts`).
- Scopes existentes, sin nuevos: `newsletter:drafts:read`, `newsletter:drafts:write`, `newsletter:preview`.
- Standalone: un solo idioma, sin `spanish`, sin bloqueo de traducción, fuera de archivo público y RSS.
- Slug standalone: `s-` + 8 chars `[a-z0-9]`. Nunca numérico; no afecta la numeración `Issue 0NN`.
- Markdown restringido **sin dependencias nuevas**: escape HTML primero; solo links `https?://` y `mailto:`.
- Labels vacíos del Build Log ⇒ el render es byte-idéntico al de hoy.
- Copy de UI y mensajes de error en español, como el resto del admin.
- Migración con `pnpm db:generate` (Railway corre `drizzle-kit migrate` en preDeploy). Columna con default ⇒ filas existentes quedan `build_log`.
- Nada de `eslint-disable` / `@ts-ignore`; refactor en vez de suprimir.
- Push/PR solo con OK explícito de Ricardo.

## Review Focus

1. **Standalone viejo en rutas de Build Log** — `update_newsletter_draft` / `set_newsletter_ad_placement` / archivo sobre un id standalone deben fallar limpio o ignorarlo, nunca escribir un `Issue` encima. Test: Task 6 (MCP kind cruzado) y Task 5 (filtros `kind` en `newsletters.ts` y `archive.ts`, test de DB).
2. **Markdown hostil** — `<script>`, `[x](javascript:alert(1))`, `"` dentro de href, `**` sin cerrar: todo sale escapado/literal. Test: Task 2.
3. **Standalone enviado por el pipeline real** — send-batch debe renderizar standalone, con unsubscribe y pixel inyectados. Test: Task 5 (`renderEmail` + test de DB de send-batch con row standalone).
4. **Lista del admin con filas standalone** — `data.date` no existe; ordenar no debe tronar. Test: Task 5 (`listIssueItem`).
5. **Issues viejos del Build Log** — sin labels nuevos rinden igual. Test: Task 4 (snapshot de igualdad con y sin labels vacíos).

---

### Task 1: Modelo standalone, columna `kind` y validación

**Files:**
- Create: `lib/newsletter/standalone-types.ts`
- Modify: `lib/db/schema.ts:110-121` (tabla `newsletterIssues`)
- Modify: `lib/newsletter/validation.ts` (agregar `validateStandalone` al final)
- Create: `drizzle/0009_*.sql` (generado)
- Test: `tests/newsletter/standalone-validation.test.ts`

**Interfaces:**
- Produces:
  - `type EmailKind = "build_log" | "standalone"`; `EMAIL_KINDS`; `isEmailKind(v: unknown): v is EmailKind`
  - `interface StandaloneEmail { slug; subject; preview; title; subtitle?; body; cta?: { text; href } }`
  - `emptyStandalone(slug: string): StandaloneEmail`; `standaloneSlug(): string`
  - `validateStandalone(value: unknown): { email: StandaloneEmail; errors?: undefined } | { email?: undefined; errors: string[] }`
  - `newsletterIssues.kind` (text, not null, default `'build_log'`)

- [ ] **Step 1: Tipos**

```ts
// lib/newsletter/standalone-types.ts
// A one-off email to the newsletter list (announcements, invitations) — not
// The Build Log. Stored in newsletter_issues with kind = "standalone" so it
// rides the same send pipeline (batches, warm-up, tracking, unsubscribe).
import { randomBytes } from "node:crypto";

export const EMAIL_KINDS = ["build_log", "standalone"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export function isEmailKind(value: unknown): value is EmailKind {
  return typeof value === "string" && (EMAIL_KINDS as readonly string[]).includes(value);
}

export interface StandaloneCta {
  text: string;
  href: string;
}

export interface StandaloneEmail {
  slug: string; // "s-k3j9x0ab" — never numeric, so it never collides with "015"
  subject: string;
  preview: string; // inbox preview text
  title: string;
  subtitle?: string;
  body: string; // restricted markdown, see render-markdown.ts
  cta?: StandaloneCta;
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function standaloneSlug(): string {
  const bytes = randomBytes(8);
  return `s-${Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("")}`;
}

export function emptyStandalone(slug: string): StandaloneEmail {
  return { slug, subject: "", preview: "", title: "", body: "" };
}
```

`standalone-types.ts` importa `node:crypto`; el editor cliente (Task 7) solo importa **tipos** (`import type`), así que no entra al bundle del cliente.

- [ ] **Step 2: Test de validación (falla)**

```ts
// tests/newsletter/standalone-validation.test.ts
import { describe, expect, it } from "vitest";
import { validateStandalone } from "@/lib/newsletter/validation";
import { emptyStandalone, standaloneSlug } from "@/lib/newsletter/standalone-types";

const valid = {
  ...emptyStandalone("s-abc12345"),
  subject: "Hackathon este sábado",
  title: "Nos vemos el sábado",
  body: "Hola **builders**.",
  cta: { text: "Regístrate", href: "https://aibuilders.mx/eventos" },
};

describe("validateStandalone", () => {
  it("accepts a complete email", () => {
    expect(validateStandalone(valid).email).toEqual(valid);
  });

  it("accepts optional subtitle and cta omitted", () => {
    const { cta: _cta, ...rest } = valid;
    expect(validateStandalone(rest).errors).toBeUndefined();
  });

  it("reports field-level errors", () => {
    const result = validateStandalone({ ...valid, subject: 3, nope: true, cta: { text: "x", href: "javascript:alert(1)" } });
    expect(result.errors).toEqual(expect.arrayContaining([
      "email: claves desconocidas: nope",
      "email.subject: falta o no es string",
      "email.cta.href: debe ser URL https://, mailto: o cadena vacía",
    ]));
  });

  it("requires a non-empty cta href when a cta is present", () => {
    expect(validateStandalone({ ...valid, cta: { text: "Ir", href: "" } }).errors)
      .toContain("email.cta.href: requerido cuando hay CTA");
  });

  it("rejects Build Log shaped input", () => {
    expect(validateStandalone({ ...valid, stories: [] }).errors).toContain("email: claves desconocidas: stories");
  });
});

describe("standaloneSlug", () => {
  it("is never numeric", () => {
    for (let i = 0; i < 50; i++) expect(standaloneSlug()).toMatch(/^s-[a-z0-9]{8}$/);
  });
});
```

Run: `pnpm vitest run tests/newsletter/standalone-validation.test.ts` → FAIL (`validateStandalone` no existe).

- [ ] **Step 3: `validateStandalone` en `lib/newsletter/validation.ts`** (reusa los helpers privados del archivo; agregar al final y el import de tipo arriba)

```ts
import type { StandaloneEmail } from "./standalone-types";

const STANDALONE_KEYS = ["slug", "subject", "preview", "title", "subtitle", "body", "cta"] as const;

export type StandaloneValidation =
  | { email: StandaloneEmail; errors?: undefined }
  | { email?: undefined; errors: string[] };

export function validateStandalone(value: unknown): StandaloneValidation {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { errors: ["email: no es serializable a JSON"] };
  }
  if (serialized === undefined) return { errors: ["email: no es serializable a JSON"] };
  if (serialized.length > MAX_SERIALIZED_CHARS) {
    return { errors: [`email: excede ${MAX_SERIALIZED_CHARS} caracteres serializado`] };
  }
  if (!isRecord(value)) return { errors: ["email: falta o no es objeto"] };

  const ctx: Ctx = { errors: [] };
  checkKeys(ctx, "email", value, STANDALONE_KEYS);
  checkText(ctx, "email.slug", value.slug, 64);
  checkText(ctx, "email.subject", value.subject);
  checkText(ctx, "email.preview", value.preview);
  checkText(ctx, "email.title", value.title);
  if (value.subtitle !== undefined) checkText(ctx, "email.subtitle", value.subtitle, MAX_BODY_TEXT);
  checkText(ctx, "email.body", value.body, MAX_BODY_TEXT);
  if (value.cta !== undefined) {
    checkObject(ctx, "email.cta", value.cta, ["text", "href"], (c, p, v) => {
      let ok = checkText(c, `${p}.text`, v.text);
      ok = checkUrl(c, `${p}.href`, v.href) && ok;
      if (ok && v.href === "") ok = fail(c, `${p}.href: requerido cuando hay CTA`);
      return ok;
    });
  }

  if (ctx.errors.length > 0) return { errors: ctx.errors };
  return { email: value as unknown as StandaloneEmail };
}
```

- [ ] **Step 4: Columna `kind`**

En `lib/db/schema.ts`, dentro de `newsletterIssues`, después de `status`:

```ts
  kind: text("kind").$type<EmailKind>().notNull().default("build_log"), // "build_log" | "standalone"
```

Import arriba: `import type { EmailKind } from "@/lib/newsletter/standalone-types";` (seguir el estilo de imports del archivo; si usa rutas relativas para `Issue`, usar relativa).

`data` sigue tipado `$type<Issue>()`: las rutas standalone castean vía helpers de Task 5 **después** de chequear `kind`.

Run: `pnpm db:generate` → crea `drizzle/0009_<nombre>.sql`. Verificar que contiene exactamente:

```sql
ALTER TABLE "newsletter_issues" ADD COLUMN "kind" text DEFAULT 'build_log' NOT NULL;
```

- [ ] **Step 5: Correr tests + tsc**

Run: `pnpm vitest run tests/newsletter/standalone-validation.test.ts && npx tsc --noEmit -p .` → PASS, sin errores.

- [ ] **Step 6: Commit**

```bash
git add lib/newsletter/standalone-types.ts lib/newsletter/validation.ts lib/db/schema.ts drizzle tests/newsletter/standalone-validation.test.ts
git commit -m "feat(newsletter): standalone email model, kind column, validation"
```

---

### Task 2: Markdown restringido

**Files:**
- Create: `lib/newsletter/render-markdown.ts`
- Test: `tests/newsletter/render-markdown.test.ts`

**Interfaces:**
- Produces: `renderMarkdown(source: string, style: MarkdownStyle): string` y `interface MarkdownStyle { p: string; h2: string; li: string; a: string }` (strings de `style="..."` inline, email-safe).

- [ ] **Step 1: Tests (fallan)**

```ts
// tests/newsletter/render-markdown.test.ts
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/newsletter/render-markdown";

const S = { p: "P", h2: "H", li: "L", a: "A" };
const md = (s: string) => renderMarkdown(s, S);

describe("renderMarkdown", () => {
  it("splits paragraphs on blank lines and keeps single newlines as <br>", () => {
    expect(md("uno\ndos\n\ntres")).toBe('<p style="P">uno<br>dos</p>\n<p style="P">tres</p>');
  });

  it("renders ## headings", () => {
    expect(md("## Agenda")).toBe('<h2 style="H">Agenda</h2>');
  });

  it("renders - lists", () => {
    expect(md("- a\n- b")).toBe('<ul style="margin:0 0 20px;padding-left:22px;"><li style="L">a</li><li style="L">b</li></ul>');
  });

  it("renders bold, italic and links", () => {
    expect(md("**hola** *mundo* [sitio](https://a.mx/?x=1&y=2)")).toBe(
      '<p style="P"><strong>hola</strong> <em>mundo</em> <a href="https://a.mx/?x=1&amp;y=2" style="A">sitio</a></p>',
    );
  });

  it("allows mailto links", () => {
    expect(md("[escríbenos](mailto:hola@aibuilders.mx)")).toContain('href="mailto:hola@aibuilders.mx"');
  });

  it("escapes raw HTML", () => {
    expect(md("<script>alert(1)</script>")).toBe('<p style="P">&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it("leaves unsafe link schemes as literal text", () => {
    const out = md("[x](javascript:alert(1))");
    expect(out).not.toContain("<a ");
    expect(out).toContain("[x](javascript:alert(1))");
  });

  it("cannot break out of href with quotes", () => {
    const out = md('[x](https://a.mx/"onmouseover="alert(1))');
    expect(out).not.toMatch(/href="[^"]*"onmouseover/);
  });

  it("leaves unmatched markers literal", () => {
    expect(md("**sin cerrar")).toBe('<p style="P">**sin cerrar</p>');
  });

  it("returns empty string for blank input", () => {
    expect(md("  \n\n ")).toBe("");
  });
});
```

Run: `pnpm vitest run tests/newsletter/render-markdown.test.ts` → FAIL (módulo no existe).

- [ ] **Step 2: Implementación**

```ts
// lib/newsletter/render-markdown.ts
// Deliberately tiny markdown for standalone emails: escape everything first,
// then re-introduce a handful of constructs. Anything unrecognized stays as
// literal text — authors can't inject HTML, and email clients get inline styles.

export interface MarkdownStyle {
  p: string;
  h2: string;
  li: string;
  a: string;
}

const SAFE_HREF = /^(https?:\/\/|mailto:)[^\s"<>]+$/i;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Input is already escaped. Links first so their text can still carry emphasis.
function inline(escaped: string, style: MarkdownStyle): string {
  return escaped
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, text: string, href: string) => {
      const raw = href.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
      return SAFE_HREF.test(raw) ? `<a href="${esc(raw)}" style="${style.a}">${text}</a>` : match;
    })
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
}

export function renderMarkdown(source: string, style: MarkdownStyle): string {
  const blocks = source.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    if (lines.length === 1 && lines[0].startsWith("## ")) {
      out.push(`<h2 style="${style.h2}">${inline(esc(lines[0].slice(3).trim()), style)}</h2>`);
    } else if (lines.every((line) => /^\s*-\s+/.test(line))) {
      const items = lines
        .map((line) => `<li style="${style.li}">${inline(esc(line.replace(/^\s*-\s+/, "")), style)}</li>`)
        .join("");
      out.push(`<ul style="margin:0 0 20px;padding-left:22px;">${items}</ul>`);
    } else {
      out.push(`<p style="${style.p}">${lines.map((line) => inline(esc(line), style)).join("<br>")}</p>`);
    }
  }
  return out.join("\n");
}
```

- [ ] **Step 3: Tests pasan**

Run: `pnpm vitest run tests/newsletter/render-markdown.test.ts` → PASS. Si el test de comillas falla, es que `SAFE_HREF` dejó pasar `"`: la regex debe excluir `"` (ya lo hace con `[^\s"<>]`).

- [ ] **Step 4: Commit**

```bash
git add lib/newsletter/render-markdown.ts tests/newsletter/render-markdown.test.ts
git commit -m "feat(newsletter): restricted markdown renderer for standalone emails"
```

---

### Task 3: Render standalone + despachador `renderEmail`

**Files:**
- Create: `lib/newsletter/email-style.ts` (paleta, fuentes, `esc`, `hr`, bloque de unsubscribe/pixel compartido)
- Modify: `lib/newsletter/render.ts` (importar de `email-style.ts` en vez de definir localmente; mismo output)
- Create: `lib/newsletter/render-standalone.ts`
- Create: `lib/newsletter/render-email.ts`
- Modify: `lib/newsletter/preview.ts` (agregar `emailPreviewHtml`, `standaloneWarnings`)
- Test: `tests/newsletter/render-standalone.test.ts`

**Interfaces:**
- Consumes: `StandaloneEmail`, `EmailKind` (Task 1); `renderMarkdown` (Task 2).
- Produces:
  - `email-style.ts`: `esc`, `BG`, `PANEL`, `TEXT`, `MUTED`, `QUIET`, `LINE`, `ACCENT`, `SANS`, `MONO`, `hr(topPadding?)`, `legalFooterLinks(): string` (la línea "Cancelar suscripción · AI BUILDERS LATAM · AI BUILDERS MEXICO"), `OPEN_PIXEL_TAG` (el `<img>` + comentario).
  - `renderStandalone(email: StandaloneEmail): string`
  - `type EmailDraft = { kind: "build_log"; data: Issue } | { kind: "standalone"; data: StandaloneEmail }`
  - `renderEmail(draft: EmailDraft): string`; `emailSubject(draft: EmailDraft): string` (build_log: `spanish?.subject ?? subject`; standalone: `subject`)
  - `emailPreviewHtml(draft: EmailDraft): string`; `standaloneWarnings(email: StandaloneEmail): string[]`

- [ ] **Step 1: Extraer `email-style.ts` sin cambiar output**

Mover de `render.ts` a `email-style.ts` (exportados): `esc`, las 7 constantes de color con sus comentarios, `SANS`, `MONO`, `hr`. Agregar:

```ts
export function legalFooterLinks(): string {
  return `<p style="margin:0;color:${QUIET};font-family:${MONO};font-size:12px;letter-spacing:normal;">
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${ACCENT};text-decoration:underline;">Cancelar suscripción</a>
      &nbsp;·&nbsp; <a href="https://aibuilders.lat" style="color:#2563eb;text-decoration:underline;">AI BUILDERS LATAM</a>
      &nbsp;·&nbsp; <a href="https://aibuilders.mx" style="color:#2563eb;text-decoration:underline;">AI BUILDERS MEXICO</a>
    </p>`;
}

export const OPEN_PIXEL_TAG = `<!-- First-party open pixel. Swapped for a signed per-contact URL at send time
     (lib/newsletter/tracking.ts); stripped in previews/tests. -->
<img src="{{{OPEN_PIXEL}}}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;overflow:hidden;">`;
```

En `render.ts`, reemplazar esos bloques literales por `${legalFooterLinks()}` y `${OPEN_PIXEL_TAG}` con **exactamente** los mismos bytes (copiar del archivo, no reescribir).

Guard de byte-igualdad: ANTES de editar, crear `/tmp/dump-buildlog.ts`:

```ts
import { writeFileSync } from "node:fs";
import { renderBuildLog } from "./lib/newsletter/render";
import issue from "./tests/newsletter/fixtures/sample-issue";
writeFileSync(process.argv[2], renderBuildLog(issue));
```

copiarlo a la raíz del repo como `dump-buildlog.ts` (no se commitea) y correr `npx tsx dump-buildlog.ts /tmp/buildlog-before.html`. Después de editar: `npx tsx dump-buildlog.ts /tmp/buildlog-after.html && cmp /tmp/buildlog-before.html /tmp/buildlog-after.html` → sin salida. Borrar `dump-buildlog.ts`.

Run: `pnpm vitest run tests/newsletter` → PASS (build-log, preview, tracking, unsubscribe sin cambios).

- [ ] **Step 2: Tests de standalone (fallan)**

```ts
// tests/newsletter/render-standalone.test.ts
import { describe, expect, it } from "vitest";
import { renderStandalone } from "@/lib/newsletter/render-standalone";
import { emailPreviewHtml, emailSubject, renderEmail } from "@/lib/newsletter/render-email";
import { standaloneWarnings } from "@/lib/newsletter/preview";
import { emptyIssue } from "@/lib/newsletter/issue";
import { renderBuildLog } from "@/lib/newsletter/render";
import type { StandaloneEmail } from "@/lib/newsletter/standalone-types";

const email: StandaloneEmail = {
  slug: "s-abc12345",
  subject: "Hackathon este sábado",
  preview: "Últimos lugares",
  title: "Nos vemos el sábado",
  subtitle: "Build night en CDMX",
  body: "Hola **builders**.\n\n- Pizza\n- Premios",
  cta: { text: "Regístrate", href: "https://aibuilders.mx/eventos" },
};

describe("renderStandalone", () => {
  const html = renderStandalone(email);

  it("renders title, subtitle, markdown body and CTA", () => {
    expect(html).toContain("Nos vemos el sábado");
    expect(html).toContain("Build night en CDMX");
    expect(html).toContain("<strong>builders</strong>");
    expect(html).toContain("<li");
    expect(html).toContain('href="https://aibuilders.mx/eventos"');
    expect(html).toContain("Regístrate");
  });

  it("keeps the legal footer, unsubscribe placeholder and open pixel", () => {
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("{{{OPEN_PIXEL}}}");
    expect(html).toContain("Últimos lugares"); // hidden inbox preview
  });

  it("is not The Build Log", () => {
    expect(html).not.toContain("The Build Log");
    expect(html).not.toContain("Patrocina");
  });

  it("omits subtitle and CTA when absent", () => {
    const out = renderStandalone({ ...email, subtitle: undefined, cta: undefined });
    expect(out).not.toContain("Build night en CDMX");
    expect(out).not.toContain("Regístrate");
  });

  it("escapes the title", () => {
    expect(renderStandalone({ ...email, title: "<b>x</b>" })).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("renderEmail", () => {
  it("dispatches by kind", () => {
    const issue = emptyIssue("010");
    expect(renderEmail({ kind: "build_log", data: issue })).toBe(renderBuildLog(issue));
    expect(renderEmail({ kind: "standalone", data: email })).toBe(renderStandalone(email));
  });

  it("picks the subject the send uses", () => {
    const issue = { ...emptyIssue("010"), subject: "EN", spanish: { ...emptyIssue("010"), subject: "ES" } };
    expect(emailSubject({ kind: "build_log", data: issue })).toBe("ES");
    expect(emailSubject({ kind: "standalone", data: email })).toBe("Hackathon este sábado");
  });

  it("preview resolves unsubscribe and strips the pixel", () => {
    const out = emailPreviewHtml({ kind: "standalone", data: email });
    expect(out).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(out).not.toContain("{{{OPEN_PIXEL}}}");
  });
});

describe("standaloneWarnings", () => {
  it("flags empty essentials", () => {
    const w = standaloneWarnings({ ...email, subject: "", preview: "", body: "" });
    expect(w).toEqual(expect.arrayContaining([
      "subject está vacío.",
      "preview (texto de inbox) está vacío.",
      "body está vacío.",
    ]));
  });

  it("is quiet for a complete email", () => {
    expect(standaloneWarnings(email)).toEqual([]);
  });
});
```

Run: `pnpm vitest run tests/newsletter/render-standalone.test.ts` → FAIL.

- [ ] **Step 3: `render-standalone.ts`**

```ts
// lib/newsletter/render-standalone.ts
import { ACCENT, BG, MUTED, SANS, TEXT, esc, hr, legalFooterLinks, OPEN_PIXEL_TAG } from "./email-style";
import { renderMarkdown } from "./render-markdown";
import type { StandaloneEmail } from "./standalone-types";

const MARKDOWN_STYLE = {
  p: `margin:0 0 20px;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.6;`,
  h2: `margin:32px 0 16px;color:${TEXT};font-family:${SANS};font-size:26px;font-weight:600;line-height:1.2;`,
  li: `margin:0 0 8px;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.55;`,
  a: `color:${ACCENT};text-decoration:underline;`,
};

export function renderStandalone(email: StandaloneEmail): string {
  const subtitle = email.subtitle?.trim()
    ? `<p style="margin:10px 0 0;color:${MUTED};font-family:${SANS};font-size:18px;line-height:1.4;">${esc(email.subtitle)}</p>`
    : "";
  const cta = email.cta?.text.trim() && email.cta.href
    ? `<tr><td style="padding:8px 0 0;">
    <a href="${esc(email.cta.href)}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:${TEXT};color:#ffffff;font-family:${SANS};font-size:16px;font-weight:600;text-decoration:none;">${esc(email.cta.text)}</a>
  </td></tr>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(email.title || email.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(email.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:32px 16px 64px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

  <tr><td style="padding:0 0 24px;">
    <h1 style="margin:0;color:${TEXT};font-family:${SANS};font-size:38px;font-weight:600;line-height:1.1;">${esc(email.title)}</h1>
    ${subtitle}
  </td></tr>
  ${hr()}

  <tr><td style="padding:28px 0 0;">
    ${renderMarkdown(email.body, MARKDOWN_STYLE)}
  </td></tr>
  ${cta}

  ${hr(40)}
  <tr><td style="padding:32px 0 0;">
    ${legalFooterLinks()}
  </td></tr>

</table>
</td></tr>
</table>
${OPEN_PIXEL_TAG}
</body>
</html>`;
}
```

- [ ] **Step 4: `render-email.ts` y previews**

```ts
// lib/newsletter/render-email.ts
// The one door to email HTML. Every caller that needs "what this row sends"
// (send-batch, test sends, previews, MCP) goes through here, so a new kind
// only has to be taught in one place.
import { stripTracking } from "./open-pixel";
import { renderBuildLog } from "./render";
import { renderStandalone } from "./render-standalone";
import type { StandaloneEmail } from "./standalone-types";
import type { Issue } from "./types";

export type EmailDraft =
  | { kind: "build_log"; data: Issue }
  | { kind: "standalone"; data: StandaloneEmail };

export function renderEmail(draft: EmailDraft): string {
  return draft.kind === "standalone" ? renderStandalone(draft.data) : renderBuildLog(draft.data);
}

export function emailSubject(draft: EmailDraft): string {
  return draft.kind === "standalone" ? draft.data.subject : draft.data.spanish?.subject ?? draft.data.subject;
}

export function emailPreviewHtml(draft: EmailDraft): string {
  return stripTracking(renderEmail(draft).replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#"));
}
```

En `lib/newsletter/preview.ts`: reescribir `previewHtml(issue)` como `emailPreviewHtml({ kind: "build_log", data: issue })` (misma salida) y agregar:

```ts
export function standaloneWarnings(email: StandaloneEmail): string[] {
  const warnings: string[] = [];
  if (!email.subject.trim()) warnings.push("subject está vacío.");
  if (email.subject.length > 150) {
    warnings.push(`subject tiene ${email.subject.length} caracteres; el inbox trunca arriba de ~150.`);
  }
  if (!email.preview.trim()) warnings.push("preview (texto de inbox) está vacío.");
  if (!email.title.trim()) warnings.push("title está vacío.");
  if (!email.body.trim()) warnings.push("body está vacío.");
  return warnings;
}
```

- [ ] **Step 5: Tests + tsc**

Run: `pnpm vitest run tests/newsletter && npx tsc --noEmit -p .` → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/newsletter/email-style.ts lib/newsletter/render.ts lib/newsletter/render-standalone.ts lib/newsletter/render-email.ts lib/newsletter/preview.ts tests/newsletter/render-standalone.test.ts
git commit -m "feat(newsletter): standalone renderer and renderEmail dispatcher"
```

---

### Task 4: Build Log con título, subtítulo y encabezados editables

**Files:**
- Modify: `lib/newsletter/types.ts` (`BaseIssue`)
- Modify: `lib/newsletter/validation.ts` (`BASE_KEYS`, `checkBaseIssue`)
- Modify: `lib/newsletter/issue-schema.ts` (`baseIssueProperties`)
- Modify: `lib/newsletter/render.ts:208-229` (títulos de sección)
- Modify: `app/(admin)/admin/newsletter/components/editable-canvas.tsx` (masthead ~l.374-379, SectionHeaders l.404, 452, 508, 594, 654)
- Modify: `tests/mcp/schema.test.ts:24` (conteo de keys)
- Test: `tests/newsletter/build-log.test.ts`

**Interfaces:**
- Produces: en `BaseIssue`, opcionales `storiesLabel?`, `essayLabel?`, `buildersLabel?`, `communityLabel?` (strings). Mismo patrón que `projectsLabel`/`eventsLabel`.

- [ ] **Step 1: Tests (fallan)** — agregar a `tests/newsletter/build-log.test.ts`:

```ts
  it("uses custom section headings when provided", () => {
    const out = renderBuildLog({
      ...issue002,
      storiesLabel: "Lo nuevo",
      essayLabel: "Columna",
      buildersLabel: "Desde MX",
      communityLabel: "La banda",
    });
    expect(out).toContain("Lo nuevo");
    expect(out).toContain("Columna");
    expect(out).not.toContain("Esta semana en IA");
    expect(out).not.toContain("Pensamiento de la semana");
  });

  it("renders identically when labels are empty or whitespace", () => {
    const blank = { ...issue002, storiesLabel: " ", essayLabel: "", buildersLabel: "", communityLabel: "" };
    expect(renderBuildLog(blank)).toBe(renderBuildLog(issue002));
  });
```

Y en `tests/newsletter/standalone-validation.test.ts` (o `tests/mcp/validation.test.ts`, el que ya prueba `validateIssue`):

```ts
  it("accepts the new optional Build Log labels", () => {
    const issue = { ...emptyIssue("010"), storiesLabel: "Lo nuevo", communityLabel: "La banda" };
    expect(validateIssue(issue).errors).toBeUndefined();
  });
```

Run: `pnpm vitest run tests/newsletter/build-log.test.ts tests/mcp/validation.test.ts` → FAIL (TS/aserciones).

- [ ] **Step 2: Tipos, validación, schema**

`types.ts`, en `BaseIssue` junto a los otros labels:

```ts
  storiesLabel?: string; // section heading for `stories` (default "Esta semana en IA")
  essayLabel?: string; // section heading for `essay` (default "Pensamiento de la semana")
  buildersLabel?: string; // section heading for builders items (default "Desde AI Builders México")
  communityLabel?: string; // section heading for `community` (default "Comunidad")
```

`validation.ts`: agregar las 4 keys a `BASE_KEYS` y en `checkBaseIssue`:

```ts
  for (const key of ["storiesLabel", "essayLabel", "buildersLabel", "communityLabel"] as const) {
    ok = (value[key] === undefined || checkText(ctx, `${path}.${key}`, value[key])) && ok;
  }
```

`issue-schema.ts`, en `baseIssueProperties`:

```ts
  storiesLabel: { ...shortText, description: 'Heading de stories (default "Esta semana en IA")' },
  essayLabel: { ...shortText, description: 'Heading del essay (default "Pensamiento de la semana")' },
  buildersLabel: { ...shortText, description: 'Heading de buildersMexicoItems (default "Desde AI Builders México")' },
  communityLabel: { ...shortText, description: 'Heading de community (default "Comunidad")' },
```

`tests/mcp/schema.test.ts:24`: `toBe(29); // 27 BaseIssue keys + spanish + stale flag`.

- [ ] **Step 3: Render** — en `render.ts` usar `issue.storiesLabel?.trim() || "Esta semana en IA"`, `issue.essayLabel?.trim() || "Pensamiento de la semana"`, `issue.buildersLabel?.trim() || "Desde AI Builders México"`, `issue.communityLabel?.trim() || "Comunidad"` en los 4 `sections.push` correspondientes.

- [ ] **Step 4: Canvas**

Masthead: reemplazar el `{issue.title}` y `{issue.subtitle}` fijos por `Editable`, conservando clases:

```tsx
        <h1 className="text-[38px] font-semibold leading-[1.1] text-gray-900 dark:text-white">
          <Editable value={issue.title} onChange={(v) => patch({ title: v })} placeholder="Título del email" />
        </h1>
        <div className="mt-2.5 text-lg leading-[1.4] text-gray-500 dark:text-gray-400">
          <Editable value={issue.subtitle} onChange={(v) => patch({ subtitle: v })} placeholder="Subtítulo" multiline />
        </div>
```

SectionHeaders: `SectionHeader` ya soporta `editableTitle`/`onTitleChange`/`titlePlaceholder`. En cada uno de los 5 (stories, essay, events, builders, community) pasar de `title="…"` a:

```tsx
        <SectionHeader
          editableTitle={issue.storiesLabel ?? ""}
          onTitleChange={(v) => patch({ storiesLabel: v })}
          titlePlaceholder="Esta semana en IA"
          compact
        />
```

(events usa `eventsLabel` con placeholder "Próximos eventos"; conservar `separated`/`compact` existentes de cada uno). Verificar leyendo `SectionHeader` (l.146+) que con `editableTitle === ""` muestra el placeholder — así el valor vacío guarda `""` y el render usa el default.

- [ ] **Step 5: Tests + tsc + lint**

Run: `pnpm vitest run && npx tsc --noEmit -p . && pnpm lint` → PASS.

- [ ] **Step 6: Verificación manual** — `pnpm dev`, abrir un draft en `/admin/newsletter/<id>`: editar título, subtítulo y "Esta semana en IA"; "Ver email real" refleja los cambios; recargar persiste.

- [ ] **Step 7: Commit**

```bash
git add lib/newsletter app/(admin)/admin/newsletter/components/editable-canvas.tsx tests
git commit -m "feat(newsletter): editable Build Log title, subtitle and section headings"
```

---

### Task 5: Persistencia y pipeline conscientes del `kind`

**Files:**
- Create: `lib/newsletter/standalone-store.ts`
- Modify: `lib/newsletter/send-batch.ts:31-67`
- Modify: `lib/newsletter/archive.ts` (3 queries)
- Modify: `lib/mcp/newsletters.ts` (filtros `kind`)
- Modify: `lib/actions/newsletter.ts` (`listIssues`, `IssueDetail`, `getIssue`, `sendReadinessError`, `sendTest` → acepta draft, nuevas acciones standalone)
- Modify: `app/(admin)/admin/newsletter/sent/[id]/page.tsx`
- Modify: `app/(admin)/admin/newsletter/[id]/page.tsx` (narrow antes de `IssueEditor`; standalone temporalmente → `notFound()` hasta Task 7)
- Test: `tests/newsletter/list-item.test.ts`, `tests/newsletter/standalone-store.test.ts` (DB), `tests/newsletter/send-batch.test.ts` (DB, caso standalone)

**Interfaces:**
- Consumes: Task 1 (`newsletterIssues.kind`, `StandaloneEmail`, `standaloneSlug`, `validateStandalone`), Task 3 (`EmailDraft`, `renderEmail`, `emailSubject`, `emailPreviewHtml`).
- Produces:
  - `standalone-store.ts`: `class StandaloneConflictError extends Error { readonly code = "draft_conflict" }`; `insertStandaloneDraft(email?: Partial<StandaloneEmail>): Promise<StandaloneRow>`; `updateStandaloneDraft(id: string, expectedVersion: number | null, email: StandaloneEmail): Promise<StandaloneRow>` (`null` = sin chequeo de versión, para el autosave del admin); `type StandaloneRow = { id; slug; subject; version; email: StandaloneEmail; updatedAt: string }`; `rowToDraft(row: { kind: EmailKind; data: unknown }): EmailDraft`.
  - `lib/actions/newsletter.ts`: `IssueDetail` pasa a `{ id; slug; status; sentAt } & EmailDraft`; `IssueListItem` gana `kind: EmailKind`; nuevas acciones `createStandaloneDraft(): Promise<void>` (redirige), `saveStandalone(id, email)`, `renderStandalonePreview(email)`, `sendStandaloneTest(email, to)`.
  - `listIssueItem(row)` exportado desde un módulo sin `"use server"` (`lib/newsletter/list-item.ts`) para testearlo.

- [ ] **Step 1: Test del list item (falla)**

```ts
// tests/newsletter/list-item.test.ts
import { describe, expect, it } from "vitest";
import { listIssueItem } from "@/lib/newsletter/list-item";
import { emptyIssue } from "@/lib/newsletter/issue";
import { emptyStandalone } from "@/lib/newsletter/standalone-types";

const base = { id: "x", slug: "s-abc12345", subject: "S", status: "draft", sentAt: null, updatedAt: new Date() };

describe("listIssueItem", () => {
  it("maps standalone rows without a date or archive flag", () => {
    expect(listIssueItem({ ...base, kind: "standalone", data: emptyStandalone("s-abc12345") as never }))
      .toMatchObject({ kind: "standalone", date: "", archivePublished: false });
  });

  it("maps Build Log rows as before", () => {
    const issue = { ...emptyIssue("010"), date: "01 Sep 2026" };
    expect(listIssueItem({ ...base, slug: "010", kind: "build_log", data: issue }))
      .toMatchObject({ kind: "build_log", date: "01 Sep 2026", archivePublished: true });
  });
});
```

`lib/newsletter/list-item.ts`:

```ts
import type { NewsletterIssueRow } from "@/lib/db/schema";
import type { EmailKind } from "./standalone-types";

export interface IssueListItem {
  id: string;
  kind: EmailKind;
  slug: string;
  subject: string;
  status: string;
  archivePublished: boolean;
  date: string;
  sentAt: Date | null;
  updatedAt: Date;
}

type ListRow = Pick<NewsletterIssueRow, "id" | "kind" | "slug" | "subject" | "status" | "data" | "sentAt" | "updatedAt">;

// Standalone emails have no issue date and never reach the public archive.
export function listIssueItem({ data, ...row }: ListRow): IssueListItem {
  if (row.kind === "standalone") return { ...row, date: "", archivePublished: false };
  return { ...row, date: data.date, archivePublished: data.archivePublished !== false };
}
```

En `lib/actions/newsletter.ts`: borrar la `interface IssueListItem` local, `export type { IssueListItem } from "@/lib/newsletter/list-item"` **no** (un archivo `"use server"` solo exporta funciones async); los consumidores importan el tipo desde `@/lib/newsletter/list-item`. Actualizar el import en `app/(admin)/admin/newsletter/page.tsx` si lo usa. `listIssues` selecciona `kind` y hace `rows.map(listIssueItem).sort(...)` (sort sin cambios; `issueDateSortValue("")` → `null`, ya soportado).

Run: `pnpm vitest run tests/newsletter/list-item.test.ts` → PASS tras implementar.

- [ ] **Step 2: `standalone-store.ts`**

```ts
// lib/newsletter/standalone-store.ts
// Persistence for kind = "standalone" rows. Every read/write filters on kind,
// so Build Log tooling can never overwrite a standalone email and vice versa.
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { newsletterIssues } from "@/lib/db/schema";
import type { EmailDraft } from "./render-email";
import { emptyStandalone, standaloneSlug, type EmailKind, type StandaloneEmail } from "./standalone-types";
import type { Issue } from "./types";

export class StandaloneConflictError extends Error {
  readonly code = "draft_conflict";
}

export interface StandaloneRow {
  id: string;
  slug: string;
  subject: string;
  version: number;
  email: StandaloneEmail;
  updatedAt: string;
}

const returning = {
  id: newsletterIssues.id,
  slug: newsletterIssues.slug,
  subject: newsletterIssues.subject,
  version: newsletterIssues.version,
  data: newsletterIssues.data,
  updatedAt: newsletterIssues.updatedAt,
};

function toRow(row: { id: string; slug: string; subject: string; version: number; data: unknown; updatedAt: Date }): StandaloneRow {
  return { id: row.id, slug: row.slug, subject: row.subject, version: row.version, email: row.data as StandaloneEmail, updatedAt: row.updatedAt.toISOString() };
}

// data is typed as Issue at the column level; kind decides the real shape.
export function rowToDraft(row: { kind: EmailKind; data: unknown }): EmailDraft {
  return row.kind === "standalone"
    ? { kind: "standalone", data: row.data as StandaloneEmail }
    : { kind: "build_log", data: row.data as Issue };
}

export async function insertStandaloneDraft(input: Partial<StandaloneEmail> = {}): Promise<StandaloneRow> {
  const slug = standaloneSlug();
  const email: StandaloneEmail = { ...emptyStandalone(slug), ...input, slug };
  const [row] = await db
    .insert(newsletterIssues)
    .values({ kind: "standalone", slug, subject: email.subject, status: "draft", data: email as unknown as Issue, version: 1 })
    .returning(returning);
  return toRow(row);
}

export async function updateStandaloneDraft(id: string, expectedVersion: number | null, input: StandaloneEmail): Promise<StandaloneRow> {
  const where = and(
    eq(newsletterIssues.id, id),
    eq(newsletterIssues.kind, "standalone"),
    eq(newsletterIssues.status, "draft"),
    ...(expectedVersion === null ? [] : [eq(newsletterIssues.version, expectedVersion)]),
  );
  const [current] = await db.select({ slug: newsletterIssues.slug }).from(newsletterIssues).where(where).limit(1);
  if (!current) throw new StandaloneConflictError("Draft not found, not standalone, or revision is stale.");

  const email: StandaloneEmail = { ...input, slug: current.slug }; // slug is immutable
  const [updated] = await db
    .update(newsletterIssues)
    .set({ subject: email.subject, data: email as unknown as Issue, version: sql`${newsletterIssues.version} + 1`, updatedAt: new Date() })
    .where(where)
    .returning(returning);
  if (!updated) throw new StandaloneConflictError("Draft changed while it was being updated.");
  return toRow(updated);
}
```

- [ ] **Step 3: Filtros `kind` en Build Log**

- `lib/mcp/newsletters.ts`: `updateNewsletterDraft` y `setNewsletterAdPlacement` agregan `eq(newsletterIssues.kind, "build_log")` a **ambos** `where` (select y update). `listNewsletterDrafts` y `getNewsletterDraft` seleccionan `kind` y lo devuelven; `getNewsletterDraft` devuelve `issue` para build_log y `email` para standalone (usar `rowToDraft`). `listNewsletterDrafts(limit, kind?: EmailKind)` filtra si viene `kind`.
- `lib/newsletter/archive.ts`: agregar `eq(newsletterIssues.kind, "build_log")` en las 3 queries.
- `lib/mcp/newsletters.ts`'s `DraftConflictError` queda como está.

- [ ] **Step 4: send-batch**

```ts
  const [issueRow] = await db
    .select({ kind: newsletterIssues.kind, data: newsletterIssues.data })
    .from(newsletterIssues)
    .where(eq(newsletterIssues.id, issueId))
    .limit(1);
  if (!issueRow) return; // issue deleted mid-flight; nothing to do
  const draft = rowToDraft(issueRow);
  // ...
  const html = renderEmail(draft);
  // en el payload:
      subject: emailSubject(draft),
```

Quitar imports de `renderBuildLog` e `Issue` si quedan sin uso.

- [ ] **Step 5: Acciones del admin**

En `lib/actions/newsletter.ts`:

- `getIssue` selecciona `kind` y devuelve `{ id, slug, status, sentAt, ...rowToDraft(row) }`. Tipo:

```ts
export type IssueDetail = { id: string; slug: string; status: string; sentAt: Date | null } & EmailDraft;
```

- `sendReadinessError`: después de los checks de status,

```ts
  if (detail.kind === "standalone") {
    const { email, errors } = validateStandalone(detail.data);
    if (errors) return { error: `El email no es válido: ${errors[0]}` };
    if (!email.subject.trim()) return { error: "Agrega un asunto antes de enviar." };
    if (!email.body.trim()) return { error: "Agrega el cuerpo del email antes de enviar." };
    return null;
  }
```

  (el resto — checks de `spanish` — queda para build_log).
- `sendTest` pasa a una función interna `deliverTest(draft: EmailDraft, email: string)` con el cuerpo actual usando `renderEmail(draft)` / `emailSubject(draft)`; `sendTest(data: Issue, email)` conserva sus checks de `spanish` y llama `deliverTest({ kind: "build_log", data }, email)`.
- Nuevas acciones (todas con `gate()`):

```ts
export async function createStandaloneDraft(): Promise<void> {
  if (await gate()) redirect("/login");
  const row = await insertStandaloneDraft();
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}/${row.id}`);
}

export async function saveStandalone(id: string, email: StandaloneEmail): Promise<ActionOk | ActionError> {
  if (await gate()) return { error: "No autorizado." };
  const { email: valid, errors } = validateStandalone(email);
  if (errors) return { error: errors[0] };
  try {
    await updateStandaloneDraft(id, null, valid);
  } catch (error) {
    if (error instanceof StandaloneConflictError) return { error: "Este email ya no es un borrador editable." };
    throw error;
  }
  revalidatePath(`${LIST_PATH}/${id}`);
  revalidatePath(LIST_PATH);
  return { ok: true };
}

export async function renderStandalonePreview(email: StandaloneEmail): Promise<string> {
  if (await gate()) return "<!doctype html><title>No autorizado</title>";
  return emailPreviewHtml({ kind: "standalone", data: email });
}

export async function sendStandaloneTest(email: StandaloneEmail, to: string): Promise<ActionOk | ActionError> {
  if (await gate()) return { error: "No autorizado." };
  if (!email.subject.trim()) return { error: "Agrega un asunto antes de enviar una prueba." };
  return deliverTest({ kind: "standalone", data: email }, to);
}
```

- `sent/[id]/page.tsx`: borrar el `previewHtml` local y usar `emailPreviewHtml(issue)` (`issue` ya es `EmailDraft`); el link "ver en archivo" (`/newsletters/${slug}`) y el título `Issue {slug}` solo para build_log — standalone muestra `issue.data.title` y sin link.
- `[id]/page.tsx`: `if (issue.kind === "standalone") notFound();` antes de `<IssueEditor … initialData={issue.data} />` (Task 7 lo reemplaza por el editor standalone). TS obliga al narrowing.

- [ ] **Step 6: Tests de DB** (corren con `DATABASE_URL`; ver Step 7)

`tests/newsletter/standalone-store.test.ts`, siguiendo el patrón `HAS_DB`/`describe.skip` de `tests/mcp/database.test.ts` (imports dinámicos en `beforeAll`, borrar filas creadas en `afterAll`):

```ts
  it("creates a standalone draft with a non-numeric slug", async () => {
    const row = await store.insertStandaloneDraft({ subject: "Hola" });
    ids.push(row.id);
    expect(row.slug).toMatch(/^s-[a-z0-9]{8}$/);
    const [db1] = await db.select().from(schema.newsletterIssues).where(eq(schema.newsletterIssues.id, row.id));
    expect(db1.kind).toBe("standalone");
  });

  it("rejects stale versions and Build Log ids", async () => {
    const row = await store.insertStandaloneDraft();
    ids.push(row.id);
    await expect(store.updateStandaloneDraft(row.id, 99, row.email)).rejects.toBeInstanceOf(store.StandaloneConflictError);
    const buildLog = await draftCreate.insertNewsletterDraft();
    ids.push(buildLog.id);
    await expect(store.updateStandaloneDraft(buildLog.id, null, row.email)).rejects.toBeInstanceOf(store.StandaloneConflictError);
  });

  it("Build Log MCP update refuses a standalone id", async () => {
    const row = await store.insertStandaloneDraft();
    ids.push(row.id);
    await expect(newsletters.updateNewsletterDraft(row.id, 1, emptyIssue("999")))
      .rejects.toBeInstanceOf(newsletters.DraftConflictError);
  });

  it("keeps sent standalone emails out of the public archive", async () => {
    const row = await store.insertStandaloneDraft({ subject: "Solo lista" });
    ids.push(row.id);
    await db.update(schema.newsletterIssues).set({ status: "sent", sentAt: new Date() }).where(eq(schema.newsletterIssues.id, row.id));
    const archive = await import("../../lib/newsletter/archive");
    expect((await archive.listPublishedIssues()).map((i) => i.slug)).not.toContain(row.slug);
    expect(await archive.getPublishedIssue(row.slug)).toBeNull();
  });
```

En `tests/newsletter/send-batch.test.ts`, un caso nuevo que inserte un issue `kind: "standalone"` con `data: { ...emptyStandalone("s-test0001"), subject: "Solo", title: "Hola", body: "Texto" }`, corra `processSendBatch` con `fakeResend()` y verifique `calls[0][0]` → `subject === "Solo"`, `html` contiene `"Hola"`, no contiene `"The Build Log"`, y no contiene `{{{RESEND_UNSUBSCRIBE_URL}}}` ni `{{{OPEN_PIXEL}}}` (inyectados).

- [ ] **Step 7: Correr todo, incluyendo DB**

Postgres local desechable:

```bash
docker run -d --rm --name aibl-test-pg -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:16
sleep 3
export DATABASE_URL=postgres://postgres:test@localhost:55432/postgres
node_modules/.bin/drizzle-kit migrate
pnpm vitest run
docker stop aibl-test-pg
```

Expected: todos PASS, **0 skipped** en los archivos de DB. Si docker no está disponible, reportarlo explícitamente como no verificado (no marcar la tarea como verde).

Luego: `npx tsc --noEmit -p . && pnpm lint` → limpio.

- [ ] **Step 8: Commit**

```bash
git add lib app tests
git commit -m "feat(newsletter): kind-aware persistence, send pipeline and archive"
```

---

### Task 6: Tools MCP para standalone

**Files:**
- Modify: `lib/mcp/protocol.ts` (tools + handlers)
- Create: `lib/newsletter/standalone-schema.ts` (JSON Schema)
- Test: `tests/mcp/protocol.test.ts`, `tests/mcp/schema.test.ts`

**Interfaces:**
- Consumes: `validateStandalone` (T1), `emailPreviewHtml`, `standaloneWarnings` (T3), `insertStandaloneDraft`, `updateStandaloneDraft`, `StandaloneConflictError` (T5), `listNewsletterDrafts(limit, kind?)` (T5).
- Produces: tools `create_standalone_email` (write), `update_standalone_email` (write), `preview_standalone_email` (preview); `list_newsletter_drafts` acepta `kind`.

- [ ] **Step 1: JSON Schema**

```ts
// lib/newsletter/standalone-schema.ts
// Mirrors validateStandalone; tests/mcp/schema.test.ts keeps them in sync.
const shortText = { type: "string", maxLength: 2_000 } as const;
const bodyText = { type: "string", maxLength: 30_000 } as const;

export const standaloneEmailJsonSchema = {
  type: "object",
  description:
    "Email suelto a la lista (no The Build Log). Un solo idioma. body es markdown restringido: " +
    "párrafos (línea en blanco), '## encabezado', '- lista', **negritas**, *itálicas*, [texto](https://…). " +
    "Cualquier HTML sale escapado.",
  properties: {
    slug: { type: "string", maxLength: 64, description: "Asignado por el servidor; se ignora al crear/editar." },
    subject: { ...shortText, description: "Asunto del email" },
    preview: { ...shortText, description: "Texto de preview del inbox" },
    title: { ...shortText, description: "Título grande del email" },
    subtitle: { ...bodyText, description: "Opcional" },
    body: bodyText,
    cta: {
      type: "object",
      description: "Botón opcional",
      properties: {
        text: shortText,
        href: { type: "string", maxLength: 2_048, pattern: "^(https?://|mailto:)" },
      },
      required: ["text", "href"],
      additionalProperties: false,
    },
  },
  required: ["subject", "preview", "title", "body"],
  additionalProperties: false,
} as const;
```

`slug` no es requerido en el schema, pero `validateStandalone` sí lo exige: en los handlers, antes de validar, hacer `{ ...input.email, slug: input.email.slug ?? "s-pending0" }` — el servidor lo sobreescribe al guardar (insert genera uno, update conserva el existente). Test para esto en Step 2.

- [ ] **Step 2: Tests (fallan)** — en `tests/mcp/protocol.test.ts`, agregar mocks `vi.mock("@/lib/newsletter/standalone-store", () => ({ insertStandaloneDraft: mocks.createStandalone, updateStandaloneDraft: mocks.updateStandalone, StandaloneConflictError: class extends Error { readonly code = "draft_conflict"; } }))` con `createStandalone`/`updateStandalone` en `vi.hoisted`, actualizar la lista esperada de tools:

```ts
      "set_newsletter_ad_placement",
      "preview_newsletter_issue",
      "create_standalone_email",
      "update_standalone_email",
      "preview_standalone_email",
```

y casos:

```ts
  const standalone = { subject: "Hola", preview: "p", title: "T", body: "Texto" };

  it("creates a standalone draft without a slug", async () => {
    mocks.createStandalone.mockResolvedValueOnce({ id: "10000000-0000-4000-8000-000000000123", version: 1 });
    const response = await handleMcpRequest({
      jsonrpc: "2.0", id: 20, method: "tools/call",
      params: { name: "create_standalone_email", arguments: { email: standalone } },
    }, actor);
    expect(response && "result" in response ? response.result.isError : true).toBeUndefined();
    expect(mocks.createStandalone).toHaveBeenCalledWith(expect.objectContaining({ subject: "Hola", body: "Texto" }));
  });

  it("rejects a standalone email with an unsafe CTA before persistence", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0", id: 21, method: "tools/call",
      params: { name: "create_standalone_email", arguments: { email: { ...standalone, cta: { text: "x", href: "javascript:alert(1)" } } } },
    }, actor);
    expect(response && "result" in response ? response.result.isError : false).toBe(true);
    expect(mocks.createStandalone).not.toHaveBeenCalled();
  });

  it("maps a standalone version conflict to draft_conflict", async () => {
    const { StandaloneConflictError } = await import("@/lib/newsletter/standalone-store");
    mocks.updateStandalone.mockRejectedValueOnce(new StandaloneConflictError("stale"));
    const response = await handleMcpRequest({
      jsonrpc: "2.0", id: 22, method: "tools/call",
      params: { name: "update_standalone_email", arguments: { id: "10000000-0000-4000-8000-000000000123", expected_revision: 1, email: standalone } },
    }, actor);
    const result = response && "result" in response ? response.result : null;
    expect(result?.isError).toBe(true);
  });

  it("previews a standalone email statelessly", async () => {
    const response = await handleMcpRequest({
      jsonrpc: "2.0", id: 23, method: "tools/call",
      params: { name: "preview_standalone_email", arguments: { email: standalone } },
    }, { ...actor, scopes: ["newsletter:preview"] });
    const result = response && "result" in response ? response.result : null;
    expect(result?.isError).toBeUndefined();
    expect(mocks.createStandalone).not.toHaveBeenCalled();
    expect(mocks.updateStandalone).not.toHaveBeenCalled();
  });

  it("a preview-only token sees exactly the two preview tools", async () => {
    const response = await handleMcpRequest(
      { jsonrpc: "2.0", id: "p2", method: "tools/list" },
      { ...actor, scopes: ["newsletter:preview"] },
    );
    const tools = response && "result" in response ? (response.result.tools as Array<{ name: string }>) : [];
    expect(tools.map((tool) => tool.name)).toEqual(["preview_newsletter_issue", "preview_standalone_email"]);
  });

  it("filters drafts by kind", async () => {
    mocks.list.mockResolvedValueOnce([]);
    await handleMcpRequest({
      jsonrpc: "2.0", id: 24, method: "tools/call",
      params: { name: "list_newsletter_drafts", arguments: { kind: "standalone" } },
    }, actor);
    expect(mocks.list).toHaveBeenCalledWith(20, "standalone");
  });
```

Borrar el test viejo "a preview-only token sees exactly one tool" (lo reemplaza el de arriba). Si `preview_newsletter_issue` ya mockea `@/lib/newsletter/preview`, extender el mock con `standaloneWarnings: () => []` y mockear `@/lib/newsletter/render-email` con `emailPreviewHtml: () => "<!doctype html><html>standalone</html>"`.

`tests/mcp/schema.test.ts`: caso que compara las keys de `standaloneEmailJsonSchema.properties` con `["slug","subject","preview","title","subtitle","body","cta"]`.

Run: `pnpm vitest run tests/mcp` → FAIL.

- [ ] **Step 3: Tools** — agregar a `NEWSLETTER_MCP_TOOLS`:

```ts
  {
    name: "create_standalone_email",
    title: "Create a standalone email draft",
    description:
      "Create a one-off email to the newsletter list (announcement, invitation) — not The Build Log. " +
      "This tool cannot send it: a human sends it from /admin/newsletter.",
    scope: MCP_WRITE_SCOPE,
    inputSchema: {
      type: "object",
      properties: { email: standaloneEmailJsonSchema },
      required: ["email"],
      additionalProperties: false,
    },
  },
  {
    name: "update_standalone_email",
    title: "Update a standalone email draft",
    description: "Replace a standalone draft at an expected revision. Fails if it is not a standalone draft, was sent, or changed since it was read.",
    scope: MCP_WRITE_SCOPE,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        expected_revision: { type: "integer", minimum: 1 },
        email: standaloneEmailJsonSchema,
      },
      required: ["id", "expected_revision", "email"],
      additionalProperties: false,
    },
  },
  {
    name: "preview_standalone_email",
    title: "Preview a standalone email",
    description:
      "Validate a standalone email and render the exact HTML the send would produce. Stateless. " +
      "The html field is large: save it to a file and open it in a browser; never echo it into the conversation.",
    scope: MCP_PREVIEW_SCOPE,
    inputSchema: {
      type: "object",
      properties: { email: standaloneEmailJsonSchema },
      required: ["email"],
      additionalProperties: false,
    },
  },
```

`list_newsletter_drafts.inputSchema.properties` gana `kind: { type: "string", enum: ["build_log", "standalone"] }`; su descripción menciona que cada fila trae `kind`. `get_newsletter_draft` descripción: "Returns `issue` for Build Log drafts and `email` for standalone drafts."

- [ ] **Step 4: Handlers** (en `invokeTool`, antes del `Unknown tool`):

```ts
  if (name === "create_standalone_email" || name === "preview_standalone_email") {
    if (!validArguments(args, ["email"]) || !isRecord(args.email)) {
      return { result: toolResult("email es requerido.", true), errorCode: "invalid_arguments" };
    }
    const validated = validateStandalone({ ...args.email, slug: args.email.slug ?? "s-pending0" });
    if (validated.errors) {
      return {
        result: toolResult({ valid: false, errors: validated.errors }, true),
        errorCode: name === "preview_standalone_email" ? "invalid_email" : "invalid_arguments",
      };
    }
    if (name === "preview_standalone_email") {
      return {
        result: toolResult({
          valid: true,
          warnings: standaloneWarnings(validated.email),
          html: emailPreviewHtml({ kind: "standalone", data: validated.email }),
        }),
      };
    }
    const { slug: _ignored, ...content } = validated.email;
    const draft = await insertStandaloneDraft(content);
    return { result: toolResult(draft), newsletterId: draft.id };
  }

  if (name === "update_standalone_email") {
    if (!validArguments(args, ["id", "expected_revision", "email"]) || !uuid(args.id) || !isRecord(args.email)) {
      return { result: toolResult("id, expected_revision, and email are required.", true), errorCode: "invalid_arguments" };
    }
    if (!Number.isInteger(args.expected_revision) || Number(args.expected_revision) < 1) {
      return { result: toolResult("expected_revision must be a positive integer.", true), errorCode: "invalid_arguments" };
    }
    const validated = validateStandalone({ ...args.email, slug: args.email.slug ?? "s-pending0" });
    if (validated.errors) {
      return { result: toolResult({ valid: false, errors: validated.errors }, true), errorCode: "invalid_arguments" };
    }
    try {
      const draft = await updateStandaloneDraft(args.id, Number(args.expected_revision), validated.email);
      return { result: toolResult(draft), newsletterId: args.id };
    } catch (cause) {
      if (cause instanceof StandaloneConflictError) {
        return { result: toolResult("The draft is missing, not a standalone email, no longer editable, or has a newer revision. Read it again before retrying.", true), errorCode: cause.code };
      }
      throw cause;
    }
  }
```

Si ESLint marca `_ignored` como unused, en vez de suprimir usar `const content: Partial<StandaloneEmail> = { ...validated.email }; delete content.slug;`.

`list_newsletter_drafts`: `validArguments(input, ["limit", "kind"])`; si `kind !== undefined && !isEmailKind(kind)` → error `"kind must be build_log or standalone."`; llamar `listNewsletterDrafts(Number(limit), kind)`.

Verificar en `lib/mcp/audit.ts` si las operaciones con rate limit están en una lista por nombre de tool; si sí, agregar `create_standalone_email` y `update_standalone_email` como mutaciones y `preview_standalone_email` como preview, con el mismo límite que sus equivalentes del Build Log.

- [ ] **Step 5: Tests + tsc + lint**

Run: `pnpm vitest run && npx tsc --noEmit -p . && pnpm lint` → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/mcp lib/newsletter/standalone-schema.ts tests/mcp
git commit -m "feat(mcp): create, update and preview standalone emails"
```

---

### Task 7: Admin — crear y editar emails sueltos

**Files:**
- Create: `app/(admin)/admin/newsletter/components/standalone-editor.tsx`
- Modify: `app/(admin)/admin/newsletter/[id]/page.tsx`
- Modify: `app/(admin)/admin/newsletter/page.tsx` (botón "Nuevo email suelto", etiqueta del kind en la lista)

**Interfaces:**
- Consumes: `saveStandalone`, `renderStandalonePreview`, `sendStandaloneTest`, `createStandaloneDraft`, `sendIssue`, `startIssueWarmup`, `retryFailed`, `getIssueProgress`, `deleteDraftIssue` (acciones existentes/T5); `StandaloneEmail` (tipo).
- Produces: `<StandaloneEditor id initialData status initialProgress />`.

- [ ] **Step 1: `StandaloneEditor`**

Componente cliente con:
- Estado `email: StandaloneEmail`, autosave con debounce de 1 s idéntico a `IssueEditor` (`useEffect` sobre `email`, salta el primer render, llama `saveStandalone(id, email)`, `saveState` "Guardando…/Guardado/Error al guardar").
- Toolbar con las **mismas clases** que `issue-editor.tsx` (copiar los bloques de l.351-520): título `Email suelto`, pastilla de status, "Eliminar borrador", "Enviar por tandas" (`startIssueWarmup` tras `saveStandalone`, mismo `confirm`), "Enviar todo ahora" (`sendIssue`, confirm "¿Enviar este email a TODOS los contactos suscritos? No se puede deshacer."), "Descargar HTML" (`renderStandalonePreview`, archivo `email-${email.slug}.html`), input + "Enviar prueba" (`sendStandaloneTest`), progreso/"Reintentar fallidos" con el mismo polling de `getIssueProgress`.
- Sin toggle Original/Español (un solo idioma).
- Layout `grid xl:grid-cols-2 gap-6`: izquierda formulario; derecha `<iframe srcDoc={srcDoc} className="h-[80vh] w-full rounded-2xl border border-black/5 bg-white" />` que se actualiza con debounce de 300 ms vía `renderStandalonePreview(email)`.
- Formulario (inputs con `className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm dark:border-white/15 dark:bg-neutral-900"`, labels `text-xs font-medium text-gray-500`):
  - Asunto, Texto de preview, Título, Subtítulo (opcional; string vacío ⇒ `subtitle: undefined`)
  - Cuerpo: `<textarea rows={16}>` con ayuda debajo: "Markdown: **negritas**, *itálicas*, [link](https://…), ## encabezado, - lista. Línea en blanco = párrafo nuevo."
  - CTA: texto + URL (ambos vacíos ⇒ `cta: undefined`; si solo uno está lleno, mostrar aviso inline "El botón necesita texto y URL." y no incluir `cta` al guardar).
- Deshabilitar inputs si `status !== "draft"`.

No refactorizar `IssueEditor` en esta tarea. La duplicación de la toolbar es deliberada y acotada; extraer un `SendToolbar` compartido queda como follow-up si Ricardo lo pide.

- [ ] **Step 2: Página `[id]`**

```tsx
  if (issue.kind === "standalone") {
    return <StandaloneEditor id={issue.id} initialData={issue.data} status={issue.status} initialProgress={progress} />;
  }
```

(reemplaza el `notFound()` temporal de Task 5; mover `getIssueProgress` antes del branch).

- [ ] **Step 3: Lista**

En `page.tsx`: junto a "Nuevo issue", un `<form action={createStandaloneDraft}><button …>Nuevo email suelto</button></form>` con las clases del botón secundario existente (agregar la key al objeto `copy` es/en: `newStandalone: "Nuevo email suelto"` / `"New standalone email"`). En cada fila: si `issue.kind === "standalone"` mostrar el `subject` como título en vez de `Issue {slug}` y una pastilla `Email suelto` (`bg-black/5 text-gray-500 text-[11px] rounded-full px-2 py-0.5`). Ocultar el toggle de archivo público para filas standalone.

- [ ] **Step 4: tsc + lint + tests**

Run: `npx tsc --noEmit -p . && pnpm lint && pnpm vitest run` → limpio.

- [ ] **Step 5: Verificación manual en el navegador** (skill `run` o `pnpm dev` + Chrome)

1. `/admin/newsletter` → "Nuevo email suelto" → redirige al editor.
2. Llenar asunto/título/cuerpo con `**negritas**`, una lista y un CTA → el iframe refleja todo.
3. Recargar → persiste.
4. "Enviar prueba" a `ricgarcas@gmail.com` → llega con asunto `[TEST] …`, link de cancelar suscripción funcional. (Solo prueba; **no** apretar "Enviar por tandas"/"Enviar todo" contra la base de producción.)
5. La lista muestra la fila con pastilla "Email suelto".
6. Un draft de Build Log sigue abriéndose en `IssueEditor` normal.

- [ ] **Step 6: Commit**

```bash
git add "app/(admin)/admin/newsletter"
git commit -m "feat(admin): compose and send standalone emails"
```

---

### Task 8: Docs para Esteban y cierre

**Files:**
- Modify: `docs/MCP_PREVIEW.md`

- [ ] **Step 1: Docs** — agregar sección "Emails sueltos" a `docs/MCP_PREVIEW.md`: qué es, las 3 tools con un ejemplo JSON mínimo de `email`, la sintaxis de markdown soportada, que el envío lo hace un humano desde `/admin/newsletter`, y que los tokens "solo preview" ven `preview_standalone_email` mientras que el preset "editor completo" ve create/update. Mencionar que título, subtítulo y encabezados del Build Log ahora son editables (`storiesLabel`, `essayLabel`, `buildersLabel`, `communityLabel`).

- [ ] **Step 2: Verificación final**

```bash
pnpm vitest run && npx tsc --noEmit -p . && pnpm lint && pnpm build
```

Expected: todo verde. `pnpm build` confirma que ningún módulo con `node:crypto` terminó en el bundle cliente.

- [ ] **Step 3: Commit**

```bash
git add docs/MCP_PREVIEW.md
git commit -m "docs: standalone email tools for the newsletter author"
```

- [ ] **Step 4: Handoff** — no push. Reportar a Ricardo: commits del branch, resultado de tests (incluyendo si los de DB corrieron), y que falta su OK para push/PR a `aibuildersmx/website-lat` (el branch incluye sus 9 commits previos rebaseados).
