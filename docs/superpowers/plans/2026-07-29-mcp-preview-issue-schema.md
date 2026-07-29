# MCP Preview Tool + Real Issue Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stateless `preview_newsletter_issue` MCP tool, a real JSON Schema for the `Issue`, and per-field validation errors, so the weekly newsletter handoff becomes validated `Issue` JSON instead of hand-written HTML.

**Architecture:** All changes live in `aibuilders-lat`. Validation gains an error-collecting `validateIssue` (with `parseIssue` delegating to it), the Issue JSON Schema moves to its own module, `previewHtml` is extracted from the server actions into a pure module, and the MCP protocol layer gains one read-nothing/write-nothing tool gated by a new `newsletter:preview` scope. The admin token form gains a scope preset selector.

**Tech Stack:** Next.js (App Router), TypeScript, Drizzle + Postgres, Vitest. Tests run with `npm test` (`vitest run`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-29-mcp-preview-issue-schema-design.md`

## Global Constraints

- Limits stay exactly as today: `MAX_SERIALIZED_CHARS = 200_000`, `MAX_SHORT_TEXT = 2_000`, `MAX_BODY_TEXT = 30_000`, `MAX_ITEMS = 100`, URL regex `/^(https?:\/\/|mailto:)/i` with empty string allowed.
- `parseIssue(value): Issue | null` keeps its exact signature — existing call sites must not change.
- The preview tool must not touch the database (no reads, no writes). Audit + rate-limit records are the only DB effect, and they happen in the shared protocol path, not the tool.
- Error messages produced by validation are Spanish, like the rest of the MCP user-facing copy.
- Validation error output is capped at 20 errors per response.
- New scope string: `newsletter:preview`. Existing scope strings must not change.
- Tool name: `preview_newsletter_issue`. Server name/version unchanged.
- Run the full suite with `npm test` from the repo root. All pre-existing tests must keep passing after every task.

---

### Task 1: `validateIssue` with per-field error paths

**Files:**
- Modify: `lib/newsletter/validation.ts` (full rewrite of the guard section; `newsletterIssueJsonSchema` stub stays put for now — Task 2 replaces it)
- Test: `tests/mcp/validation.test.ts` (add cases; existing cases must keep passing unchanged)

**Interfaces:**
- Consumes: `Issue`, `BaseIssue` and section types from `lib/newsletter/types.ts` (unchanged).
- Produces:
  - `validateIssue(value: unknown): { issue: Issue; errors?: undefined } | { issue?: undefined; errors: string[] }` — new export.
  - `parseIssue(value: unknown): Issue | null` — same signature, now delegates to `validateIssue`.
  - Error strings are `path: mensaje` with paths rooted at `issue`, e.g. `issue.stories[2].href: debe ser URL https://, mailto: o cadena vacía`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/mcp/validation.test.ts` (keep every existing test untouched):

```ts
import { validateIssue } from "@/lib/newsletter/validation";

describe("validateIssue error paths", () => {
  it("returns the issue for a valid input", () => {
    const result = validateIssue(emptyIssue("008"));
    expect(result.errors).toBeUndefined();
    expect(result.issue).toEqual(emptyIssue("008"));
  });

  it("names the exact field for a bad URL inside an array", () => {
    const result = validateIssue({
      ...emptyIssue("008"),
      stories: [
        { eyebrow: "01", title: "Ok", href: "https://ok.dev", body: "b" },
        { eyebrow: "02", title: "Bad", href: "javascript:alert(1)", body: "b" },
      ],
    });
    expect(result.issue).toBeUndefined();
    expect(result.errors).toEqual([
      "issue.stories[1].href: debe ser URL https://, mailto: o cadena vacía",
    ]);
  });

  it("reports missing required fields and unknown keys with paths", () => {
    const { subject: _omit, ...withoutSubject } = emptyIssue("008");
    const result = validateIssue({ ...withoutSubject, status: "sent" });
    expect(result.errors).toContain("issue: claves desconocidas: status");
    expect(result.errors).toContain("issue.subject: falta o no es string");
  });

  it("reports nested errors inside the spanish variant", () => {
    const spanish = { ...emptyIssue("008"), essay: { ...emptyIssue("008").essay, linkHref: "ftp://x" } };
    delete (spanish as Record<string, unknown>).spanish;
    const result = validateIssue({ ...emptyIssue("008"), spanish });
    expect(result.errors).toEqual([
      "issue.spanish.essay.linkHref: debe ser URL https://, mailto: o cadena vacía",
    ]);
  });

  it("caps output at 20 errors", () => {
    const stories = Array.from({ length: 30 }, () => ({ eyebrow: 1, title: 1, href: 1, body: 1 }));
    const result = validateIssue({ ...emptyIssue("008"), stories });
    expect(result.errors).toHaveLength(20);
  });

  it("rejects oversized payloads with a single clear error", () => {
    const result = validateIssue({ ...emptyIssue("008"), subtitle: "x".repeat(210_000) });
    expect(result.errors).toEqual(["issue: excede 200000 caracteres serializado"]);
  });
});
```

Note: `emptyIssue` and `describe/expect/it` are already imported at the top of this file.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test -- tests/mcp/validation.test.ts`
Expected: FAIL — `validateIssue` is not exported.

- [ ] **Step 3: Rewrite `lib/newsletter/validation.ts`**

Replace the entire file content below the imports (keep the `import type {...} from "./types"` block and the `newsletterIssueJsonSchema` export at the bottom exactly as they are today) with:

```ts
const MAX_SERIALIZED_CHARS = 200_000;
const MAX_SHORT_TEXT = 2_000;
const MAX_BODY_TEXT = 30_000;
const MAX_ITEMS = 100;
const MAX_ERRORS = 20;
const SAFE_URL = /^(https?:\/\/|mailto:)/i;

type RecordValue = Record<string, unknown>;
type Ctx = { errors: string[] };

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function fail(ctx: Ctx, message: string): false {
  if (ctx.errors.length < MAX_ERRORS) ctx.errors.push(message);
  return false;
}

function checkKeys(ctx: Ctx, path: string, value: RecordValue, keys: readonly string[]): boolean {
  const extra = Object.keys(value).filter((key) => !keys.includes(key));
  if (extra.length === 0) return true;
  return fail(ctx, `${path}: claves desconocidas: ${extra.join(", ")}`);
}

function checkText(ctx: Ctx, path: string, value: unknown, max = MAX_SHORT_TEXT): boolean {
  if (typeof value !== "string") return fail(ctx, `${path}: falta o no es string`);
  if (value.length > max) return fail(ctx, `${path}: excede ${max} caracteres`);
  return true;
}

function checkUrl(ctx: Ctx, path: string, value: unknown): boolean {
  if (typeof value !== "string") return fail(ctx, `${path}: falta o no es string`);
  if (value.length > 2_048) return fail(ctx, `${path}: excede 2048 caracteres`);
  if (value !== "" && !SAFE_URL.test(value)) {
    return fail(ctx, `${path}: debe ser URL https://, mailto: o cadena vacía`);
  }
  return true;
}

function checkBool(ctx: Ctx, path: string, value: unknown): boolean {
  if (typeof value === "boolean") return true;
  return fail(ctx, `${path}: debe ser boolean`);
}

function checkArray(
  ctx: Ctx,
  path: string,
  value: unknown,
  item: (ctx: Ctx, path: string, value: unknown) => boolean,
): boolean {
  if (!Array.isArray(value)) return fail(ctx, `${path}: falta o no es array`);
  if (value.length > MAX_ITEMS) return fail(ctx, `${path}: máximo ${MAX_ITEMS} elementos`);
  let ok = true;
  value.forEach((entry, index) => {
    ok = item(ctx, `${path}[${index}]`, entry) && ok;
  });
  return ok;
}

function checkObject(
  ctx: Ctx,
  path: string,
  value: unknown,
  keys: readonly string[],
  fields: (ctx: Ctx, path: string, value: RecordValue) => boolean,
): boolean {
  if (!isRecord(value)) return fail(ctx, `${path}: falta o no es objeto`);
  let ok = checkKeys(ctx, path, value, keys);
  ok = fields(ctx, path, value) && ok;
  return ok;
}

function checkStory(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["eyebrow", "title", "href", "body"], (c, p, v) => {
    let ok = checkText(c, `${p}.eyebrow`, v.eyebrow);
    ok = checkText(c, `${p}.title`, v.title) && ok;
    ok = checkUrl(c, `${p}.href`, v.href) && ok;
    ok = checkText(c, `${p}.body`, v.body, MAX_BODY_TEXT) && ok;
    return ok;
  });
}

function checkEssay(ctx: Ctx, path: string, value: unknown): boolean {
  const keys = ["eyebrow", "title", "body", "author", "authorRole", "linkText", "linkHref"];
  return checkObject(ctx, path, value, keys, (c, p, v) => {
    let ok = checkText(c, `${p}.eyebrow`, v.eyebrow);
    ok = checkText(c, `${p}.title`, v.title) && ok;
    ok = checkText(c, `${p}.body`, v.body, MAX_BODY_TEXT) && ok;
    ok = checkText(c, `${p}.author`, v.author) && ok;
    ok = checkText(c, `${p}.authorRole`, v.authorRole) && ok;
    ok = checkText(c, `${p}.linkText`, v.linkText) && ok;
    ok = checkUrl(c, `${p}.linkHref`, v.linkHref) && ok;
    return ok;
  });
}

function checkUseCase(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["icon", "title", "body"], (c, p, v) => {
    let ok = checkText(c, `${p}.icon`, v.icon, 32);
    ok = checkText(c, `${p}.title`, v.title) && ok;
    ok = checkText(c, `${p}.body`, v.body, MAX_BODY_TEXT) && ok;
    return ok;
  });
}

function checkProject(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["eyebrow", "title", "author", "href", "body"], (c, p, v) => {
    let ok = checkText(c, `${p}.eyebrow`, v.eyebrow);
    ok = checkText(c, `${p}.title`, v.title) && ok;
    ok = checkText(c, `${p}.author`, v.author) && ok;
    ok = checkUrl(c, `${p}.href`, v.href) && ok;
    ok = checkText(c, `${p}.body`, v.body, MAX_BODY_TEXT) && ok;
    return ok;
  });
}

function checkEvent(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["day", "month", "label", "title", "body", "href"], (c, p, v) => {
    let ok = checkText(c, `${p}.day`, v.day, 16);
    ok = checkText(c, `${p}.month`, v.month, 24) && ok;
    ok = checkText(c, `${p}.label`, v.label) && ok;
    ok = checkText(c, `${p}.title`, v.title) && ok;
    ok = checkText(c, `${p}.body`, v.body, MAX_BODY_TEXT) && ok;
    ok = checkUrl(c, `${p}.href`, v.href) && ok;
    return ok;
  });
}

function checkCommunity(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["label", "title", "titleSuffix", "body", "stats"], (c, p, v) => {
    let ok = checkText(c, `${p}.label`, v.label);
    ok = checkText(c, `${p}.title`, v.title) && ok;
    ok = checkText(c, `${p}.titleSuffix`, v.titleSuffix) && ok;
    ok = checkText(c, `${p}.body`, v.body, MAX_BODY_TEXT) && ok;
    ok = checkArray(c, `${p}.stats`, v.stats, (cc, pp, vv) => checkText(cc, pp, vv)) && ok;
    return ok;
  });
}

function checkJob(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["label", "title", "meta", "href"], (c, p, v) => {
    let ok = checkText(c, `${p}.label`, v.label);
    ok = checkText(c, `${p}.title`, v.title) && ok;
    ok = checkText(c, `${p}.meta`, v.meta) && ok;
    ok = checkUrl(c, `${p}.href`, v.href) && ok;
    return ok;
  });
}

function checkBuildersLink(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["text", "href"], (c, p, v) => {
    let ok = checkText(c, `${p}.text`, v.text);
    ok = checkUrl(c, `${p}.href`, v.href) && ok;
    return ok;
  });
}

function checkBuildersItem(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["title", "body", "href"], (c, p, v) => {
    let ok = checkText(c, `${p}.title`, v.title);
    ok = checkText(c, `${p}.body`, v.body, MAX_BODY_TEXT) && ok;
    ok = checkUrl(c, `${p}.href`, v.href) && ok;
    return ok;
  });
}

function checkSponsor(ctx: Ctx, path: string, value: unknown): boolean {
  return checkObject(ctx, path, value, ["title", "description", "href"], (c, p, v) => {
    let ok = checkText(c, `${p}.title`, v.title);
    ok = (v.description === undefined || checkText(c, `${p}.description`, v.description, MAX_BODY_TEXT)) && ok;
    ok = checkUrl(c, `${p}.href`, v.href) && ok;
    return ok;
  });
}

const BASE_KEYS = [
  "slug", "archivePublished", "subject", "preview", "issueLabel", "showIssueLabel",
  "date", "readingTime", "title", "subtitle", "sponsor", "stories", "essay", "useCases",
  "projectsLabel", "projects", "eventsLabel", "events", "buildersMexico",
  "buildersMexicoItems", "community", "jobs",
] as const;

function checkBaseIssue(ctx: Ctx, path: string, value: RecordValue): boolean {
  let ok = checkKeys(ctx, path, value, BASE_KEYS);
  ok = checkText(ctx, `${path}.slug`, value.slug, 64) && ok;
  ok = checkText(ctx, `${path}.subject`, value.subject) && ok;
  ok = checkText(ctx, `${path}.preview`, value.preview) && ok;
  ok = checkText(ctx, `${path}.issueLabel`, value.issueLabel) && ok;
  ok = (value.archivePublished === undefined || checkBool(ctx, `${path}.archivePublished`, value.archivePublished)) && ok;
  ok = (value.showIssueLabel === undefined || checkBool(ctx, `${path}.showIssueLabel`, value.showIssueLabel)) && ok;
  ok = checkText(ctx, `${path}.date`, value.date) && ok;
  ok = checkText(ctx, `${path}.readingTime`, value.readingTime) && ok;
  ok = checkText(ctx, `${path}.title`, value.title) && ok;
  ok = checkText(ctx, `${path}.subtitle`, value.subtitle, MAX_BODY_TEXT) && ok;
  ok = (value.sponsor === undefined || checkSponsor(ctx, `${path}.sponsor`, value.sponsor)) && ok;
  ok = checkArray(ctx, `${path}.stories`, value.stories, checkStory) && ok;
  ok = checkEssay(ctx, `${path}.essay`, value.essay) && ok;
  ok = checkArray(ctx, `${path}.useCases`, value.useCases, checkUseCase) && ok;
  ok = (value.projectsLabel === undefined || checkText(ctx, `${path}.projectsLabel`, value.projectsLabel)) && ok;
  ok = (value.projects === undefined || checkArray(ctx, `${path}.projects`, value.projects, checkProject)) && ok;
  ok = (value.eventsLabel === undefined || checkText(ctx, `${path}.eventsLabel`, value.eventsLabel)) && ok;
  ok = checkArray(ctx, `${path}.events`, value.events, checkEvent) && ok;
  ok = (value.buildersMexico === undefined || checkBuildersLink(ctx, `${path}.buildersMexico`, value.buildersMexico)) && ok;
  ok = (value.buildersMexicoItems === undefined || checkArray(ctx, `${path}.buildersMexicoItems`, value.buildersMexicoItems, checkBuildersItem)) && ok;
  ok = checkCommunity(ctx, `${path}.community`, value.community) && ok;
  ok = checkArray(ctx, `${path}.jobs`, value.jobs, checkJob) && ok;
  return ok;
}

export type IssueValidation =
  | { issue: Issue; errors?: undefined }
  | { issue?: undefined; errors: string[] };

export function validateIssue(value: unknown): IssueValidation {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { errors: ["issue: no es serializable a JSON"] };
  }
  if (serialized === undefined) return { errors: ["issue: no es serializable a JSON"] };
  if (serialized.length > MAX_SERIALIZED_CHARS) {
    return { errors: [`issue: excede ${MAX_SERIALIZED_CHARS} caracteres serializado`] };
  }
  if (!isRecord(value)) return { errors: ["issue: falta o no es objeto"] };

  const ctx: Ctx = { errors: [] };
  checkKeys(ctx, "issue", value, [...BASE_KEYS, "spanish", "spanishTranslationStale"]);
  const original = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "spanish" && key !== "spanishTranslationStale"),
  );
  checkBaseIssue(ctx, "issue", original);
  if (value.spanish !== undefined) {
    if (!isRecord(value.spanish)) fail(ctx, "issue.spanish: falta o no es objeto");
    else checkBaseIssue(ctx, "issue.spanish", value.spanish);
  }
  if (value.spanishTranslationStale !== undefined && typeof value.spanishTranslationStale !== "boolean") {
    fail(ctx, "issue.spanishTranslationStale: debe ser boolean");
  }

  if (ctx.errors.length > 0) return { errors: ctx.errors };
  return { issue: value as unknown as Issue };
}

export function parseIssue(value: unknown): Issue | null {
  return validateIssue(value).issue ?? null;
}
```

Adjust the type-only import at the top: this rewrite only needs `import type { Issue } from "./types";` — remove the now-unused section-type imports.

Note on `checkBaseIssue` vs. the old code: `issue.spanish` key filtering happens once in `validateIssue` (the `original` object), exactly like the old `parseIssue`; `checkKeys` inside `checkBaseIssue` re-checks `BASE_KEYS` only, which is correct for both `original` and `spanish`.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — including every pre-existing test in `tests/mcp/validation.test.ts` (same `parseIssue` semantics) and `tests/mcp/protocol.test.ts` / `tests/mcp/database.test.ts` (untouched behavior). If `caps output at 20 errors` fails with 21+, check that every `fail()` respects `MAX_ERRORS`.

- [ ] **Step 5: Commit**

```bash
git add lib/newsletter/validation.ts tests/mcp/validation.test.ts
git commit -m "feat(newsletter): validateIssue with per-field error paths"
```

---

### Task 2: Real JSON Schema for the Issue + contract test

**Files:**
- Create: `lib/newsletter/issue-schema.ts`
- Modify: `lib/newsletter/validation.ts` (delete the `newsletterIssueJsonSchema` stub at the bottom)
- Modify: `lib/mcp/protocol.ts:15` (import the schema from its new home)
- Test: `tests/mcp/schema.test.ts` (new)

**Interfaces:**
- Consumes: `validateIssue` from Task 1, `emptyIssue` from `lib/newsletter/issue.ts`.
- Produces:
  - `newsletterIssueJsonSchema` — same constant name protocol.ts already uses, now exported from `lib/newsletter/issue-schema.ts`.
  - `BASE_ISSUE_REQUIRED: readonly string[]` — exported for the contract test.

- [ ] **Step 1: Write the failing contract test**

Create `tests/mcp/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyIssue } from "@/lib/newsletter/issue";
import { validateIssue } from "@/lib/newsletter/validation";
import { BASE_ISSUE_REQUIRED, newsletterIssueJsonSchema } from "@/lib/newsletter/issue-schema";

type SchemaObject = {
  type: string;
  properties: Record<string, unknown>;
  required: readonly string[];
  additionalProperties: boolean;
};

const schema = newsletterIssueJsonSchema as unknown as SchemaObject;

describe("Issue JSON Schema ↔ runtime validation contract", () => {
  it("declares every property with no additional properties allowed", () => {
    expect(schema.additionalProperties).toBe(false);
    const declared = Object.keys(schema.properties).sort();
    // The schema's key set is authoritative for clients; the validator must
    // agree: a valid issue may only use declared keys, and any undeclared key
    // must be rejected by both sides.
    expect(declared).toContain("spanish");
    expect(declared).toContain("spanishTranslationStale");
    expect(declared.length).toBe(24); // 22 BaseIssue keys + spanish + stale flag
  });

  it("every schema-required field is required by the validator", () => {
    for (const field of BASE_ISSUE_REQUIRED) {
      const issue = { ...emptyIssue("009") } as Record<string, unknown>;
      delete issue[field];
      const result = validateIssue(issue);
      expect(result.errors, `deleting "${field}" should fail validation`).toBeDefined();
    }
  });

  it("every schema-optional field really is optional in the validator", () => {
    const optional = Object.keys(schema.properties).filter(
      (key) => !schema.required.includes(key) && key !== "spanish" && key !== "spanishTranslationStale",
    );
    // emptyIssue omits every optional field except showIssueLabel; strip it too.
    const issue = { ...emptyIssue("009") } as Record<string, unknown>;
    delete issue.showIssueLabel;
    for (const key of optional) {
      expect(key in issue, `emptyIssue should not carry optional "${key}"`).toBe(false);
    }
    expect(validateIssue(issue).errors).toBeUndefined();
  });

  it("a key not present in the schema is rejected by the validator", () => {
    const result = validateIssue({ ...emptyIssue("009"), sneaky: true });
    expect(result.errors).toContain("issue: claves desconocidas: sneaky");
    expect("sneaky" in schema.properties).toBe(false);
  });

  it("the canonical empty issue passes validation", () => {
    expect(validateIssue(emptyIssue("009")).errors).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/mcp/schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/newsletter/issue-schema`.

- [ ] **Step 3: Create `lib/newsletter/issue-schema.ts`**

```ts
// JSON Schema for the canonical newsletter Issue, published by the MCP tools'
// inputSchema. Mirrors the runtime checks in lib/newsletter/validation.ts;
// tests/mcp/schema.test.ts keeps the two from drifting.

const shortText = { type: "string", maxLength: 2_000 } as const;
const bodyText = { type: "string", maxLength: 30_000 } as const;
const urlText = {
  type: "string",
  maxLength: 2_048,
  description: "URL https:// o mailto:, o cadena vacía para renderizar sin link",
  pattern: "^(https?://|mailto:|$)",
} as const;

function arrayOf(items: object, description?: string) {
  return { type: "array", maxItems: 100, items, ...(description ? { description } : {}) } as const;
}

const storySchema = {
  type: "object",
  properties: {
    eyebrow: { ...shortText, description: 'Etiqueta corta, ej. "01 · Desarrollo"' },
    title: shortText,
    href: urlText,
    body: { ...bodyText, description: 'Cuerpo de la nota; suele abrir con "Por qué importa: ..."' },
  },
  required: ["eyebrow", "title", "href", "body"],
  additionalProperties: false,
} as const;

const essaySchema = {
  type: "object",
  properties: {
    eyebrow: { ...shortText, description: 'Ej. "Ensayo · 3 min de lectura"' },
    title: shortText,
    body: bodyText,
    author: shortText,
    authorRole: shortText,
    linkText: shortText,
    linkHref: urlText,
  },
  required: ["eyebrow", "title", "body", "author", "authorRole", "linkText", "linkHref"],
  additionalProperties: false,
} as const;

const useCaseSchema = {
  type: "object",
  properties: {
    icon: { type: "string", maxLength: 32, description: 'Un solo glifo, ej. "⌁"' },
    title: shortText,
    body: bodyText,
  },
  required: ["icon", "title", "body"],
  additionalProperties: false,
} as const;

const projectSchema = {
  type: "object",
  description: "Proyecto de la comunidad (mapea de showcase_items del MCP de Aiby)",
  properties: {
    eyebrow: { ...shortText, description: 'Ej. "Salud · MVP" (derivado de tags/dominio)' },
    title: shortText,
    author: { ...shortText, description: "Crédito del builder — el punto de la sección" },
    href: urlText,
    body: bodyText,
  },
  required: ["eyebrow", "title", "author", "href", "body"],
  additionalProperties: false,
} as const;

const eventSchema = {
  type: "object",
  properties: {
    day: { type: "string", maxLength: 16, description: 'Ej. "18"' },
    month: { type: "string", maxLength: 24, description: 'Ej. "Jun"' },
    label: { ...shortText, description: 'Lugar, ej. "VIRTUAL" o "Ciudad de México"' },
    title: shortText,
    body: bodyText,
    href: urlText,
  },
  required: ["day", "month", "label", "title", "body", "href"],
  additionalProperties: false,
} as const;

const communitySchema = {
  type: "object",
  properties: {
    label: { ...shortText, description: 'Ej. "Resumen de la semana"' },
    title: shortText,
    titleSuffix: { ...shortText, description: 'Ej. "· herramientas dev · Claude Code ..."' },
    body: bodyText,
    stats: arrayOf(shortText, "Líneas de bullets"),
  },
  required: ["label", "title", "titleSuffix", "body", "stats"],
  additionalProperties: false,
} as const;

const jobSchema = {
  type: "object",
  properties: {
    label: { ...shortText, description: 'Ej. "Contratando"' },
    title: shortText,
    meta: { ...shortText, description: 'Ej. "Freelance · remoto LatAm · 4 a 6 meses"' },
    href: urlText,
  },
  required: ["label", "title", "meta", "href"],
  additionalProperties: false,
} as const;

const buildersLinkSchema = {
  type: "object",
  properties: { text: shortText, href: urlText },
  required: ["text", "href"],
  additionalProperties: false,
} as const;

const buildersItemSchema = {
  type: "object",
  properties: { title: shortText, body: bodyText, href: urlText },
  required: ["title", "body", "href"],
  additionalProperties: false,
} as const;

const sponsorSchema = {
  type: "object",
  properties: {
    title: shortText,
    description: bodyText,
    href: urlText,
  },
  required: ["title", "href"],
  additionalProperties: false,
} as const;

export const BASE_ISSUE_REQUIRED = [
  "slug", "subject", "preview", "issueLabel", "date", "readingTime", "title",
  "subtitle", "stories", "essay", "useCases", "events", "community", "jobs",
] as const;

const baseIssueProperties = {
  slug: { type: "string", maxLength: 64, description: 'Identificador público, ej. "002"' },
  archivePublished: { type: "boolean", description: "false oculta issues enviados del archivo público" },
  subject: { ...shortText, description: "Subject del email" },
  preview: { ...shortText, description: "Texto de preview del inbox" },
  issueLabel: { ...shortText, description: 'Ej. "Issue 002"' },
  showIssueLabel: { type: "boolean", description: "Default true en issues existentes" },
  date: { ...shortText, description: 'Ej. "31 May 2026"' },
  readingTime: { ...shortText, description: 'Ej. "6 min de lectura"' },
  title: { ...shortText, description: 'Ej. "The Build Log"' },
  subtitle: bodyText,
  sponsor: sponsorSchema,
  stories: arrayOf(storySchema),
  essay: essaySchema,
  useCases: arrayOf(useCaseSchema),
  projectsLabel: { ...shortText, description: 'Heading de projects (default "Proyectos de la comunidad")' },
  projects: arrayOf(projectSchema),
  eventsLabel: { ...shortText, description: 'Heading de events (default "Próximos eventos")' },
  events: arrayOf(eventSchema),
  buildersMexico: buildersLinkSchema,
  buildersMexicoItems: arrayOf(buildersItemSchema),
  community: communitySchema,
  jobs: arrayOf(jobSchema),
} as const;

export const newsletterIssueJsonSchema = {
  type: "object",
  description:
    "The canonical structured newsletter Issue. El issue base se escribe en el idioma de trabajo; " +
    "la variante `spanish` (la que se envía) se genera en el composer y normalmente se omite aquí.",
  properties: {
    ...baseIssueProperties,
    spanish: {
      type: "object",
      description: "Variante en español que se envía. Generada en el composer; normalmente omitida por autores.",
      properties: baseIssueProperties,
      required: [...BASE_ISSUE_REQUIRED],
      additionalProperties: false,
    },
    spanishTranslationStale: { type: "boolean" },
  },
  required: [...BASE_ISSUE_REQUIRED],
  additionalProperties: false,
} as const;
```

- [ ] **Step 4: Point protocol.ts at the new module and delete the stub**

In `lib/mcp/protocol.ts`, change line 15 from:

```ts
import { newsletterIssueJsonSchema, parseIssue } from "@/lib/newsletter/validation";
```

to:

```ts
import { newsletterIssueJsonSchema } from "@/lib/newsletter/issue-schema";
import { parseIssue } from "@/lib/newsletter/validation";
```

In `lib/newsletter/validation.ts`, delete the entire `export const newsletterIssueJsonSchema = {...}` block (the old stub). Then confirm nothing else imported it from validation:

Run: `grep -rn "newsletterIssueJsonSchema" lib app tests --include="*.ts" --include="*.tsx"`
Expected: only `lib/newsletter/issue-schema.ts`, `lib/mcp/protocol.ts`, `tests/mcp/schema.test.ts`.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS. If the `declares every property` count fails, recount: 22 keys in `baseIssueProperties` + `spanish` + `spanishTranslationStale` = 24.

- [ ] **Step 6: Commit**

```bash
git add lib/newsletter/issue-schema.ts lib/newsletter/validation.ts lib/mcp/protocol.ts tests/mcp/schema.test.ts
git commit -m "feat(mcp): publish a real JSON Schema for the newsletter Issue"
```

---

### Task 3: Extract `previewHtml` + `issueWarnings` into a pure module

**Files:**
- Create: `lib/newsletter/preview.ts`
- Modify: `lib/actions/newsletter.ts:123-131` (delete the local `previewHtml`, import from the new module)
- Test: `tests/newsletter/preview.test.ts` (new)

**Interfaces:**
- Consumes: `renderBuildLog` from `lib/newsletter/render.ts`, `stripTracking` from `lib/newsletter/tracking.ts`, `Issue` type.
- Produces:
  - `previewHtml(issue: Issue): string` — exact behavior of the current private helper.
  - `issueWarnings(issue: Issue): string[]` — Spanish, human-readable, non-blocking warnings.

- [ ] **Step 1: Write the failing tests**

Create `tests/newsletter/preview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emptyIssue } from "@/lib/newsletter/issue";
import { issueWarnings, previewHtml } from "@/lib/newsletter/preview";

describe("previewHtml", () => {
  it("renders HTML with the unsubscribe placeholder resolved", () => {
    const html = previewHtml(emptyIssue("010"));
    expect(html).toContain("<!doctype html>");
    expect(html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("renders the spanish variant when present, like the real send", () => {
    const issue = {
      ...emptyIssue("010"),
      subject: "English subject",
      spanish: { ...emptyIssue("010"), title: "Título en español único XYZ" },
    };
    expect(previewHtml(issue)).toContain("Título en español único XYZ");
  });
});

describe("issueWarnings", () => {
  it("warns about the missing spanish variant and empty sections", () => {
    const warnings = issueWarnings(emptyIssue("010"));
    expect(warnings).toContain("Sin versión en español: se genera en el composer antes de enviar.");
    expect(warnings).toContain("stories está vacío.");
    expect(warnings).toContain("useCases está vacío.");
    expect(warnings).toContain("events está vacío.");
    expect(warnings).toContain("jobs está vacío.");
    expect(warnings).toContain("essay.linkHref está vacío.");
  });

  it("warns about empty hrefs by index and long subjects", () => {
    const issue = {
      ...emptyIssue("010"),
      subject: "x".repeat(151),
      stories: [
        { eyebrow: "01", title: "Con link", href: "https://ok.dev", body: "b" },
        { eyebrow: "02", title: "Sin link", href: "", body: "b" },
      ],
    };
    const warnings = issueWarnings(issue);
    expect(warnings).toContain("stories[1].href está vacío (el título no tendrá link).");
    expect(warnings).toContain("subject tiene 151 caracteres; el inbox trunca arriba de ~150.");
    expect(warnings).not.toContain("stories[0].href está vacío (el título no tendrá link).");
    expect(warnings).not.toContain("stories está vacío.");
  });

  it("evaluates the variant that would be sent", () => {
    const spanish = { ...emptyIssue("010"), preview: "" };
    const issue = { ...emptyIssue("010"), spanish };
    expect(issueWarnings(issue)).toContain("preview (texto de inbox) está vacío.");
  });

  it("returns section warnings only, not spanish, for a complete issue", () => {
    const complete = {
      ...emptyIssue("010"),
      stories: [{ eyebrow: "01", title: "T", href: "https://x.dev", body: "b" }],
      useCases: [{ icon: "⌁", title: "T", body: "b" }],
      events: [{ day: "18", month: "Jun", label: "VIRTUAL", title: "T", body: "b", href: "https://x.dev" }],
      jobs: [{ label: "Contratando", title: "T", meta: "Remoto", href: "https://x.dev" }],
      essay: { ...emptyIssue("010").essay, linkHref: "https://x.dev" },
    };
    const warnings = issueWarnings(complete);
    expect(warnings).toEqual(["Sin versión en español: se genera en el composer antes de enviar."]);
  });
});
```

Note: `emptyIssue("010").preview` is non-empty (it carries a placeholder), so the base-issue case does not trigger the empty-preview warning — that's why the third test uses a `spanish` variant with `preview: ""`.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/newsletter/preview.test.ts`
Expected: FAIL — cannot resolve `@/lib/newsletter/preview`.

- [ ] **Step 3: Create `lib/newsletter/preview.ts`**

```ts
import { renderBuildLog } from "./render";
import { stripTracking } from "./tracking";
import type { Issue } from "./types";

// Exactly what the send would produce, minus tracking, with Resend's
// unsubscribe placeholder resolved to a no-op link. Shared by the composer's
// iframe preview (lib/actions/newsletter.ts) and the MCP preview tool.
export function previewHtml(issue: Issue): string {
  return stripTracking(
    renderBuildLog(issue).replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#"),
  );
}

// Non-blocking heads-ups for authors: valid but probably not ready to ship.
// Evaluates the variant the send would use (spanish ?? base), same as the renderer.
export function issueWarnings(issue: Issue): string[] {
  const warnings: string[] = [];
  const sent = issue.spanish ?? issue;
  if (!issue.spanish) {
    warnings.push("Sin versión en español: se genera en el composer antes de enviar.");
  }
  if (!sent.preview.trim()) warnings.push("preview (texto de inbox) está vacío.");
  if (sent.subject.length > 150) {
    warnings.push(`subject tiene ${sent.subject.length} caracteres; el inbox trunca arriba de ~150.`);
  }
  if (sent.stories.length === 0) warnings.push("stories está vacío.");
  if (sent.useCases.length === 0) warnings.push("useCases está vacío.");
  if (sent.events.length === 0) warnings.push("events está vacío.");
  if (sent.jobs.length === 0) warnings.push("jobs está vacío.");
  sent.stories.forEach((story, index) => {
    if (!story.href) warnings.push(`stories[${index}].href está vacío (el título no tendrá link).`);
  });
  if (!sent.essay.linkHref) warnings.push("essay.linkHref está vacío.");
  (sent.projects ?? []).forEach((project, index) => {
    if (!project.href) warnings.push(`projects[${index}].href está vacío.`);
  });
  sent.events.forEach((event, index) => {
    if (!event.href) warnings.push(`events[${index}].href está vacío.`);
  });
  sent.jobs.forEach((job, index) => {
    if (!job.href) warnings.push(`jobs[${index}].href está vacío.`);
  });
  return warnings;
}
```

- [ ] **Step 4: Replace the local helper in `lib/actions/newsletter.ts`**

Delete the local `previewHtml` function (the block at lines 123-131, including its comment) and add to the imports:

```ts
import { previewHtml } from "@/lib/newsletter/preview";
```

Then find every remaining call site of `previewHtml` in that file (at least `renderPreview` and the test-send path near line 504) and confirm they compile against the imported version — the signature is identical, so no call-site edits are expected. If `stripTracking` was imported in `lib/actions/newsletter.ts` **only** for the deleted helper, remove that import; if the test-send path still uses it directly, leave it.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, including any pre-existing tests under `tests/newsletter/` and `tests/actions/`.

- [ ] **Step 6: Commit**

```bash
git add lib/newsletter/preview.ts lib/actions/newsletter.ts tests/newsletter/preview.test.ts
git commit -m "refactor(newsletter): extract previewHtml + issueWarnings into a pure module"
```

---

### Task 4: `preview_newsletter_issue` MCP tool + `newsletter:preview` scope

**Files:**
- Modify: `lib/mcp/auth.ts` (new scope constant + preset arrays)
- Modify: `lib/mcp/audit.ts:45-56` (rename `withinMcpMutationRateLimit` → `withinMcpOperationRateLimit`, add preview limit)
- Modify: `lib/mcp/protocol.ts` (tool definition, `invokeTool` branch, field-level errors for the write tools, renamed rate-limit import)
- Test: `tests/mcp/protocol.test.ts` (new cases + mock updates)

**Interfaces:**
- Consumes: `validateIssue` (Task 1), `newsletterIssueJsonSchema` (Task 2), `previewHtml` + `issueWarnings` (Task 3).
- Produces:
  - `MCP_PREVIEW_SCOPE = "newsletter:preview"` and `PREVIEW_ONLY_MCP_SCOPES` from `lib/mcp/auth.ts`; `DEFAULT_MCP_SCOPES` now includes the preview scope (Task 5 consumes both arrays).
  - `withinMcpOperationRateLimit(actor, operation)` from `lib/mcp/audit.ts` (renamed; preview capped at 20/min per token).
  - Tool result shapes: valid → `{ valid: true, warnings: string[], html: string }`; invalid → `{ valid: false, errors: string[] }` with `isError: true`.

- [ ] **Step 1: Update mocks and write the failing tests**

In `tests/mcp/protocol.test.ts`:

1. Update the audit mock (rename):

```ts
vi.mock("@/lib/mcp/audit", () => ({
  withinMcpOperationRateLimit: mocks.rate,
  recordMcpAudit: mocks.audit,
}));
```

2. Update the auth mock to include the new scope:

```ts
vi.mock("@/lib/mcp/auth", () => ({
  MCP_READ_SCOPE: "newsletter:drafts:read",
  MCP_WRITE_SCOPE: "newsletter:drafts:write",
  MCP_PREVIEW_SCOPE: "newsletter:preview",
  hasScope: (actor: { scopes: string[] }, scope: string) => actor.scopes.includes(scope),
}));
```

3. Add a preview module mock next to the others:

```ts
vi.mock("@/lib/newsletter/preview", () => ({
  previewHtml: mocks.preview,
  issueWarnings: mocks.warnings,
}));
```

with `preview: vi.fn()` and `warnings: vi.fn()` added to the `vi.hoisted` mocks object, and in `beforeEach`:

```ts
mocks.preview.mockReturnValue("<!doctype html><html>preview</html>");
mocks.warnings.mockReturnValue(["stories está vacío."]);
```

4. Extend the actor's scopes: `scopes: [MCP_READ_SCOPE, MCP_WRITE_SCOPE, "newsletter:preview"]`.

5. Update the existing `exposes only draft-safe tools` expectation to the five names (append `"preview_newsletter_issue"`).

6. Add the new cases:

```ts
it("previews a valid issue without touching persistence", async () => {
  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 10,
    method: "tools/call",
    params: { name: "preview_newsletter_issue", arguments: { issue: emptyIssue("011") } },
  }, actor);
  expect(response).toMatchObject({
    result: {
      structuredContent: {
        valid: true,
        warnings: ["stories está vacío."],
        html: "<!doctype html><html>preview</html>",
      },
    },
  });
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

it("returns field-level errors and no html for an invalid issue", async () => {
  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 11,
    method: "tools/call",
    params: { name: "preview_newsletter_issue", arguments: { issue: { nope: true } } },
  }, actor);
  const result = response && "result" in response ? response.result : null;
  expect(result?.isError).toBe(true);
  const text = (result?.content as Array<{ text: string }>)[0]?.text ?? "";
  expect(text).toContain('"valid": false');
  expect(text).toContain("claves desconocidas: nope");
  expect(text).not.toContain("<!doctype");
  expect(mocks.preview).not.toHaveBeenCalled();
});

it("hides the preview tool from tokens without the preview scope", async () => {
  const response = await handleMcpRequest(
    { jsonrpc: "2.0", id: "t", method: "tools/list" },
    { ...actor, scopes: [MCP_READ_SCOPE, MCP_WRITE_SCOPE] },
  );
  const tools = response && "result" in response ? (response.result.tools as Array<{ name: string }>) : [];
  expect(tools.map((tool) => tool.name)).not.toContain("preview_newsletter_issue");
});

it("a preview-only token sees exactly one tool", async () => {
  const response = await handleMcpRequest(
    { jsonrpc: "2.0", id: "p", method: "tools/list" },
    { ...actor, scopes: ["newsletter:preview"] },
  );
  const tools = response && "result" in response ? (response.result.tools as Array<{ name: string }>) : [];
  expect(tools.map((tool) => tool.name)).toEqual(["preview_newsletter_issue"]);
});

it("surfaces field-level details when create receives a bad issue", async () => {
  const response = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 12,
    method: "tools/call",
    params: { name: "create_newsletter_draft", arguments: { issue: { nope: true } } },
  }, actor);
  const result = response && "result" in response ? response.result : null;
  expect(result?.isError).toBe(true);
  expect((result?.content as Array<{ text: string }>)[0]?.text).toContain("claves desconocidas: nope");
  expect(mocks.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/mcp/protocol.test.ts`
Expected: FAIL — `withinMcpOperationRateLimit` not exported (module load error) or unknown tool.

- [ ] **Step 3: Update `lib/mcp/auth.ts`**

Change the scope block at the top to:

```ts
export const MCP_READ_SCOPE = "newsletter:drafts:read";
export const MCP_WRITE_SCOPE = "newsletter:drafts:write";
export const MCP_PREVIEW_SCOPE = "newsletter:preview";
export const DEFAULT_MCP_SCOPES = [MCP_READ_SCOPE, MCP_WRITE_SCOPE, MCP_PREVIEW_SCOPE] as const;
export const PREVIEW_ONLY_MCP_SCOPES = [MCP_PREVIEW_SCOPE] as const;
```

Everything else in the file stays as is (`authenticateMcpToken` unchanged — spec decision: tokens remain owned by admin accounts).

- [ ] **Step 4: Update `lib/mcp/audit.ts`**

Rename and extend the per-operation limiter:

```ts
export async function withinMcpOperationRateLimit(
  actor: McpActor,
  operation: string,
): Promise<boolean> {
  if (operation === "create_newsletter_draft") {
    return claimMcpRateLimit(`token:${actor.tokenId}:create`, 10);
  }
  if (operation === "update_newsletter_draft") {
    return claimMcpRateLimit(`token:${actor.tokenId}:update`, 30);
  }
  if (operation === "preview_newsletter_issue") {
    return claimMcpRateLimit(`token:${actor.tokenId}:preview`, 20);
  }
  return true;
}
```

Then update every reference to the old name:

Run: `grep -rn "withinMcpMutationRateLimit" lib app tests --include="*.ts" --include="*.tsx"`
Expected after fixing: zero matches (protocol.ts import + call updated in Step 5; the test mock was already updated in Step 1). Check `tests/mcp/database.test.ts` too — if it imports the old name, update it the same way.

- [ ] **Step 5: Update `lib/mcp/protocol.ts`**

1. Imports: add `MCP_PREVIEW_SCOPE` to the auth import; change the audit import to `withinMcpOperationRateLimit`; add:

```ts
import { issueWarnings, previewHtml } from "@/lib/newsletter/preview";
import { validateIssue } from "@/lib/newsletter/validation";
import type { Issue } from "@/lib/newsletter/types";
```

(`parseIssue` is no longer imported — the write tools switch to `validateIssue`.)

2. Append to `NEWSLETTER_MCP_TOOLS`:

```ts
{
  name: "preview_newsletter_issue",
  title: "Preview a newsletter issue",
  description:
    "Validate an Issue and render the exact HTML the send would produce (spanish ?? base variant). " +
    "Stateless: reads and writes nothing — safe to call as often as needed while iterating. " +
    "The html field is tens of KB: save it to a file and open it in a browser; never echo it into the conversation.",
  scope: MCP_PREVIEW_SCOPE,
  inputSchema: {
    type: "object",
    properties: { issue: newsletterIssueJsonSchema },
    required: ["issue"],
    additionalProperties: false,
  },
},
```

3. In `invokeTool`, replace the `create_newsletter_draft` issue-parsing lines:

```ts
let issue: Issue | undefined;
if (input.issue !== undefined) {
  const validated = validateIssue(input.issue);
  if (validated.errors) {
    return {
      result: toolResult({ error: "issue no cumple el modelo del newsletter.", details: validated.errors }, true),
      errorCode: "invalid_arguments",
    };
  }
  issue = validated.issue;
}
const draft = await createNewsletterDraft(issue, input.subject as string | undefined);
```

and the `update_newsletter_draft` parsing:

```ts
const validated = validateIssue(args.issue);
if (validated.errors) {
  return {
    result: toolResult({ error: "issue no cumple el modelo del newsletter.", details: validated.errors }, true),
    errorCode: "invalid_arguments",
  };
}
```

(with the subsequent `updateNewsletterDraft(args.id, Number(args.expected_revision), validated.issue)` call using `validated.issue`).

4. Add the preview branch in `invokeTool`, before the final `return { protocolError: ... }`:

```ts
if (name === "preview_newsletter_issue") {
  if (!validArguments(args, ["issue"]) || args.issue === undefined) {
    return { result: toolResult("issue es requerido.", true), errorCode: "invalid_arguments" };
  }
  const validated = validateIssue(args.issue);
  if (validated.errors) {
    return {
      result: toolResult({ valid: false, errors: validated.errors }, true),
      errorCode: "invalid_issue",
    };
  }
  return {
    result: toolResult({
      valid: true,
      warnings: issueWarnings(validated.issue),
      html: previewHtml(validated.issue),
    }),
  };
}
```

5. Update the `withinMcpMutationRateLimit(...)` call in `handleMcpRequest` to `withinMcpOperationRateLimit(...)`.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS. Watch for `tests/mcp/database.test.ts` — if it stubs or imports the renamed audit function, Step 4's grep should have caught it.

- [ ] **Step 7: Commit**

```bash
git add lib/mcp/auth.ts lib/mcp/audit.ts lib/mcp/protocol.ts tests/mcp/protocol.test.ts tests/mcp/database.test.ts
git commit -m "feat(mcp): stateless preview_newsletter_issue tool behind newsletter:preview scope"
```

(Drop `tests/mcp/database.test.ts` from the `git add` if it needed no changes.)

---

### Task 5: Scope preset selector when creating tokens

**Files:**
- Modify: `lib/actions/mcp.ts:50-70` (`createMcpToken` reads a `scopes` preset from the form)
- Modify: `app/(admin)/admin/mcp/components/mcp-token-manager.tsx` (radio selector + copy update)
- Test: `tests/actions/mcp.test.ts` (new)

**Interfaces:**
- Consumes: `DEFAULT_MCP_SCOPES`, `PREVIEW_ONLY_MCP_SCOPES` from `lib/mcp/auth.ts` (Task 4).
- Produces: `createMcpToken` accepts form field `scopes` with values `"editor"` (default) or `"preview"`; anything else returns `{ error: "Preset de permisos inválido." }`.

- [ ] **Step 1: Write the failing test**

Create `tests/actions/mcp.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  values: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/db/client", () => ({
  db: { insert: () => ({ values: mocks.values }) },
}));

import { createMcpToken } from "@/lib/actions/mcp";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("createMcpToken scope presets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ id: "10000000-0000-4000-8000-000000000001", role: "admin" });
    mocks.values.mockResolvedValue(undefined);
  });

  it("defaults to the full editor preset", async () => {
    const result = await createMcpToken({}, form({ name: "MacBook de Ben" }));
    expect(result.token).toMatch(/^aibl_mcp_v1_/);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      scopes: ["newsletter:drafts:read", "newsletter:drafts:write", "newsletter:preview"],
    }));
  });

  it("creates a preview-only token", async () => {
    const result = await createMcpToken({}, form({ name: "Token de Esteban", scopes: "preview" }));
    expect(result.error).toBeUndefined();
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      scopes: ["newsletter:preview"],
    }));
  });

  it("rejects unknown presets", async () => {
    const result = await createMcpToken({}, form({ name: "X", scopes: "admin" }));
    expect(result.error).toBe("Preset de permisos inválido.");
    expect(mocks.values).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/actions/mcp.test.ts`
Expected: FAIL — the default insert carries only the two old scopes (after Task 4, three) and/or `scopes: "admin"` is not rejected. If the module fails to load because `lib/actions/mcp.ts` pulls in more transitive server-only imports than the mocks cover, mock those modules the same way the existing `tests/actions/*` files do — follow their pattern.

- [ ] **Step 3: Update `createMcpToken`**

In `lib/actions/mcp.ts`, change the import to include the preset arrays:

```ts
import { DEFAULT_MCP_SCOPES, PREVIEW_ONLY_MCP_SCOPES } from "@/lib/mcp/auth";
```

and inside `createMcpToken`, after the name validation:

```ts
const preset = String(formData.get("scopes") ?? "editor");
if (preset !== "editor" && preset !== "preview") {
  return { error: "Preset de permisos inválido." };
}
const scopes = preset === "preview" ? [...PREVIEW_ONLY_MCP_SCOPES] : [...DEFAULT_MCP_SCOPES];
```

and use `scopes` in the insert (`scopes,` instead of `scopes: [...DEFAULT_MCP_SCOPES],`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/actions/mcp.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the selector to the form UI**

In `app/(admin)/admin/mcp/components/mcp-token-manager.tsx`, inside the `<form>` after the intro paragraph and before the name-input row, add:

```tsx
<fieldset className="mt-5 max-w-2xl">
  <legend className="text-xs font-medium text-gray-400 dark:text-gray-500">Permisos</legend>
  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-4">
    <label className="flex flex-1 cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-3 transition hover:border-black/30 dark:border-white/15 dark:hover:border-white/35">
      <input type="radio" name="scopes" value="editor" defaultChecked className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">Editor completo</span>
        <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
          Leer, crear y editar borradores, más preview. No puede publicar ni enviar.
        </span>
      </span>
    </label>
    <label className="flex flex-1 cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-3 transition hover:border-black/30 dark:border-white/15 dark:hover:border-white/35">
      <input type="radio" name="scopes" value="preview" className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">Solo preview</span>
        <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
          Valida y renderiza issues sin tocar la base. Para quien arma el contenido (Esteban).
        </span>
      </span>
    </label>
  </div>
</fieldset>
```

Also update the intro paragraph copy (currently "El token vence en 90 días. Solo permite leer, crear y editar borradores; …") to:

```
El token vence en 90 días. Ningún preset puede publicar, enviar ni eliminar newsletters.
```

- [ ] **Step 6: Run the full suite and eyeball the form**

Run: `npm test`
Expected: PASS.

Manual check (optional but recommended): `npm run dev`, open `/admin/mcp`, confirm the two radio cards render and the form still creates a token.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/mcp.ts "app/(admin)/admin/mcp/components/mcp-token-manager.tsx" tests/actions/mcp.test.ts
git commit -m "feat(admin): scope presets (editor completo / solo preview) for MCP tokens"
```

---

### Task 6: Author guide `docs/MCP_PREVIEW.md`

**Files:**
- Create: `docs/MCP_PREVIEW.md`

**Interfaces:**
- Consumes: everything shipped in Tasks 1-5; mirrors the style of `aibuilders-bot/docs/MCP_NEWSLETTER.md` (the Aiby guide Esteban already uses).
- Produces: standalone onboarding doc; no code depends on it.

- [ ] **Step 1: Write the doc**

Create `docs/MCP_PREVIEW.md`:

```markdown
# Build Log MCP — Guía para el autor del newsletter

Este servidor MCP valida y renderiza issues de **The Build Log** para que puedas
iterar el contenido desde tu terminal y entregar un JSON listo para subir.

> **Tu entregable es el `Issue` JSON validado, no el HTML.** El HTML que te
> devuelve el preview es solo para que veas tu trabajo renderizado; quien sube
> el draft y publica es el editor (Ben) desde el composer web.

---

## Tus credenciales

| Campo | Valor |
|---|---|
| **Endpoint** | `https://aibuilders.lat/api/mcp` |
| **Auth** | `Authorization: Bearer <tu-token>` |
| **Token** | (te lo pasan por canal privado — empieza con `aibl_mcp_v1_`) |

El token vence en 90 días y es **solo-preview**: no puede leer, crear ni editar
borradores, mucho menos publicar. Si lo pierdes, avisa para revocarlo y generar
otro. **No lo subas a un repo ni lo pegues en chats públicos.**

## Cómo conectarlo

### Codex

```toml
[mcp_servers.build_log]
url = "https://aibuilders.lat/api/mcp"
bearer_token_env_var = "AI_BUILDERS_MCP_TOKEN"
```

### Claude Code

```bash
claude mcp add --transport http build-log https://aibuilders.lat/api/mcp \
  --header "Authorization: Bearer aibl_mcp_v1_TU_TOKEN"
```

## La tool

**`preview_newsletter_issue({ issue })`**

- Si el issue es **inválido** → `{ valid: false, errors: [...] }` con la ruta
  exacta de cada problema (`issue.stories[2].href: debe ser URL https://, mailto:
  o cadena vacía`). Corrige y reintenta.
- Si es **válido** → `{ valid: true, warnings: [...], html: "..." }`. Guarda el
  `html` en un archivo y ábrelo en el navegador — es el mismo render del envío
  real. Los `warnings` no bloquean, pero atiéndelos (links vacíos, secciones
  vacías, subject demasiado largo).

El esquema completo del `Issue` viene en el `inputSchema` de la tool — tu agente
lo ve solo. Escribe el issue base en el idioma que te acomode (spanglish OK); la
versión en español que se envía la genera el editor en el composer.

## Workflow semanal

1. Conecta también el **MCP de Aiby** y arranca con `get_weekly_digest` (ver su
   guía: `aibuilders-bot/docs/MCP_NEWSLETTER.md`).
2. Arma el `Issue` con ese material: `stories`, `essay`, `useCases`, `projects`
   (del showcase), `events`, `community`, `jobs`.
3. Itera con `preview_newsletter_issue` hasta que se vea bien y sin warnings
   importantes.
4. Entrega el `Issue` JSON final (archivo `.json`) al editor. Fin de tu parte.

## Límites

- 20 previews por minuto por token (y 120 requests/min en total).
- Issue de hasta 200 KB serializado.
- Cada request queda en el audit log del sitio.
```

- [ ] **Step 2: Verify the endpoint URL**

Run: `grep -n "NEXT_PUBLIC_SITE_URL" .env.example`
If the canonical production origin differs from `https://aibuilders.lat`, fix the doc to match it (both the table and the config snippets).

- [ ] **Step 3: Commit**

```bash
git add docs/MCP_PREVIEW.md
git commit -m "docs: MCP preview guide for the newsletter author"
```

---

## Final verification (after all tasks)

- [ ] Run `npm test` — full suite green.
- [ ] Run `npx tsc --noEmit` (or `npm run build` if faster to trust) — no type errors from the refactors.
- [ ] Run `npm run lint` — clean.
- [ ] Grep sanity: `grep -rn "withinMcpMutationRateLimit\|from \"@/lib/newsletter/validation\"" lib app tests --include="*.ts" --include="*.tsx"` — the old rate-limit name is gone everywhere; validation imports are only `parseIssue`/`validateIssue`/`IssueValidation`.
- [ ] End-to-end smoke (needs local DB): `npm run dev`, create a preview-only token in `/admin/mcp`, then:

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# → exactly one tool: preview_newsletter_issue

curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"preview_newsletter_issue","arguments":{"issue":{"bad":true}}}}'
# → valid:false with error paths
```
