import type {
  BaseIssue,
  BuildersMexicoItem,
  BuildersMexicoLink,
  Community,
  Essay,
  EventItem,
  Issue,
  JobItem,
  ShowcaseProject,
  SponsorPlacement,
  Story,
  UseCase,
} from "./types";

const MAX_SERIALIZED_CHARS = 200_000;
const MAX_SHORT_TEXT = 2_000;
const MAX_BODY_TEXT = 30_000;
const MAX_ITEMS = 100;
const SAFE_URL = /^(https?:\/\/|mailto:)/i;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: RecordValue, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function text(value: unknown, max = MAX_SHORT_TEXT): value is string {
  return typeof value === "string" && value.length <= max;
}

function url(value: unknown): value is string {
  return text(value, 2_048) && (value === "" || SAFE_URL.test(value));
}

function arrayOf<T>(
  value: unknown,
  check: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.length <= MAX_ITEMS && value.every(check);
}

function story(value: unknown): value is Story {
  return isRecord(value) && hasOnlyKeys(value, ["eyebrow", "title", "href", "body"])
    && text(value.eyebrow) && text(value.title) && url(value.href) && text(value.body, MAX_BODY_TEXT);
}

function essay(value: unknown): value is Essay {
  return isRecord(value)
    && hasOnlyKeys(value, ["eyebrow", "title", "body", "author", "authorRole", "linkText", "linkHref"])
    && text(value.eyebrow) && text(value.title) && text(value.body, MAX_BODY_TEXT)
    && text(value.author) && text(value.authorRole) && text(value.linkText) && url(value.linkHref);
}

function useCase(value: unknown): value is UseCase {
  return isRecord(value) && hasOnlyKeys(value, ["icon", "title", "body"])
    && text(value.icon, 32) && text(value.title) && text(value.body, MAX_BODY_TEXT);
}

function project(value: unknown): value is ShowcaseProject {
  return isRecord(value) && hasOnlyKeys(value, ["eyebrow", "title", "author", "href", "body"])
    && text(value.eyebrow) && text(value.title) && text(value.author)
    && url(value.href) && text(value.body, MAX_BODY_TEXT);
}

function event(value: unknown): value is EventItem {
  return isRecord(value) && hasOnlyKeys(value, ["day", "month", "label", "title", "body", "href"])
    && text(value.day, 16) && text(value.month, 24) && text(value.label)
    && text(value.title) && text(value.body, MAX_BODY_TEXT) && url(value.href);
}

function community(value: unknown): value is Community {
  return isRecord(value) && hasOnlyKeys(value, ["label", "title", "titleSuffix", "body", "stats"])
    && text(value.label) && text(value.title) && text(value.titleSuffix)
    && text(value.body, MAX_BODY_TEXT) && arrayOf(value.stats, (item): item is string => text(item));
}

function job(value: unknown): value is JobItem {
  return isRecord(value) && hasOnlyKeys(value, ["label", "title", "meta", "href"])
    && text(value.label) && text(value.title) && text(value.meta) && url(value.href);
}

function buildersLink(value: unknown): value is BuildersMexicoLink {
  return isRecord(value) && hasOnlyKeys(value, ["text", "href"])
    && text(value.text) && url(value.href);
}

function buildersItem(value: unknown): value is BuildersMexicoItem {
  return isRecord(value) && hasOnlyKeys(value, ["title", "body", "href"])
    && text(value.title) && text(value.body, MAX_BODY_TEXT) && url(value.href);
}

function sponsor(value: unknown): value is SponsorPlacement {
  return isRecord(value) && hasOnlyKeys(value, ["title", "description", "href"])
    && text(value.title) && (value.description === undefined || text(value.description, MAX_BODY_TEXT))
    && url(value.href);
}

const BASE_KEYS = [
  "slug", "archivePublished", "subject", "preview", "issueLabel", "showIssueLabel",
  "date", "readingTime", "title", "subtitle", "sponsor", "stories", "essay", "useCases",
  "projectsLabel", "projects", "eventsLabel", "events", "buildersMexico",
  "buildersMexicoItems", "community", "jobs",
] as const;

function baseIssue(value: unknown): value is BaseIssue {
  if (!isRecord(value) || !hasOnlyKeys(value, BASE_KEYS)) return false;
  return text(value.slug, 64)
    && text(value.subject) && text(value.preview) && text(value.issueLabel)
    && (value.archivePublished === undefined || typeof value.archivePublished === "boolean")
    && (value.showIssueLabel === undefined || typeof value.showIssueLabel === "boolean")
    && text(value.date) && text(value.readingTime) && text(value.title)
    && text(value.subtitle, MAX_BODY_TEXT)
    && (value.sponsor === undefined || sponsor(value.sponsor))
    && arrayOf(value.stories, story) && essay(value.essay) && arrayOf(value.useCases, useCase)
    && (value.projectsLabel === undefined || text(value.projectsLabel))
    && (value.projects === undefined || arrayOf(value.projects, project))
    && (value.eventsLabel === undefined || text(value.eventsLabel))
    && arrayOf(value.events, event)
    && (value.buildersMexico === undefined || buildersLink(value.buildersMexico))
    && (value.buildersMexicoItems === undefined || arrayOf(value.buildersMexicoItems, buildersItem))
    && community(value.community) && arrayOf(value.jobs, job);
}

export function parseIssue(value: unknown): Issue | null {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return null;
  }
  if (serialized.length > MAX_SERIALIZED_CHARS || !isRecord(value)) return null;
  if (!hasOnlyKeys(value, [...BASE_KEYS, "spanish", "spanishTranslationStale"])) return null;

  const original = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "spanish" && key !== "spanishTranslationStale"),
  );
  if (!baseIssue(original)) return null;
  if (value.spanish !== undefined && !baseIssue(value.spanish)) return null;
  if (
    value.spanishTranslationStale !== undefined
    && typeof value.spanishTranslationStale !== "boolean"
  ) return null;
  return value as unknown as Issue;
}

export const newsletterIssueJsonSchema = {
  type: "object",
  description: "The canonical structured newsletter Issue object returned by get_newsletter_draft.",
  additionalProperties: true,
} as const;
