import { isAdPlacement } from "./ad-placement";
import { parseImageUrl } from "./image-url";
import { IMAGE_LINE } from "./render-markdown";
import type { StandaloneEmail } from "./standalone-types";
import { AD_PLACEMENTS, type Issue } from "./types";

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
  "date", "readingTime", "title", "subtitle", "adPlacement", "sponsor", "stories", "essay", "useCases",
  "projectsLabel", "projects", "eventsLabel", "events", "buildersMexico",
  "buildersMexicoItems", "community", "jobs",
  "storiesLabel", "essayLabel", "buildersLabel", "communityLabel",
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
  ok = (value.adPlacement === undefined || isAdPlacement(value.adPlacement)
    || fail(ctx, `${path}.adPlacement: debe ser uno de ${AD_PLACEMENTS.join(", ")}`)) && ok;
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
  for (const key of ["storiesLabel", "essayLabel", "buildersLabel", "communityLabel"] as const) {
    ok = (value[key] === undefined || checkText(ctx, `${path}.${key}`, value[key])) && ok;
  }
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

const STANDALONE_KEYS = ["slug", "subject", "preview", "title", "subtitle", "body", "cta"] as const;

export type StandaloneValidation =
  | { email: StandaloneEmail; errors?: undefined }
  | { email?: undefined; errors: string[] };

const IMAGE_TOKEN = /!\[[^\]\n]*\]\([^)\n]*\)/;

// Images must be a paragraph of their own, uploaded to us, and carry alt text
// (many clients block images on first open, so alt is what gets read).
function checkBodyImages(ctx: Ctx, body: string): void {
  body.replace(/\r\n?/g, "\n").split(/\n\s*\n/).forEach((block, index) => {
    if (!IMAGE_TOKEN.test(block)) return;
    const path = `email.body (párrafo ${index + 1})`;
    const match = IMAGE_LINE.exec(block.trim());
    if (!match) {
      fail(ctx, `${path}: una imagen va sola en su párrafo, con una línea en blanco antes y después`);
    } else if (!parseImageUrl(match[2])) {
      fail(ctx, `${path}: la imagen debe estar subida a AI Builders (upload_newsletter_image); no se aceptan links externos`);
    } else if (!match[1].trim()) {
      fail(ctx, `${path}: la imagen necesita texto alternativo: ![descripción](url)`);
    }
  });
}

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
  if (checkText(ctx, "email.body", value.body, MAX_BODY_TEXT)) checkBodyImages(ctx, value.body as string);
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
