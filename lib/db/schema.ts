import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Issue } from "@/lib/newsletter/types";

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(), // always lowercased before insert
    name: text("name"),
    locale: text("locale"),
    sources: text("sources").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    isPremium: boolean("is_premium").notNull().default(false),
    newsletterSubscribed: boolean("newsletter_subscribed").notNull().default(true),
    metadata: jsonb("metadata").notNull().default({}),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sourcesIdx: index("contacts_sources_idx").using("gin", t.sources),
    tagsIdx: index("contacts_tags_idx").using("gin", t.tags),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(), // always lowercased before insert
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(), // sha256 of the cookie token
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("sessions_user_id_idx").on(t.userId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Newsletter issues ("The Build Log"). `data` holds the full structured Issue
// (lib/newsletter/types.ts) as JSONB — the single canonical model edited by the
// panel and, later, by an external generator / AI tools / an MCP agent.
export const newsletterIssues = pgTable("newsletter_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // e.g. "003"; also Issue.slug
  subject: text("subject").notNull().default(""), // denormalized for list views
  status: text("status").notNull().default("draft"), // "draft" | "sending" | "sent"
  data: jsonb("data").$type<Issue>().notNull(), // the full Issue object
  resendBroadcastId: text("resend_broadcast_id"), // set once broadcast
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NewsletterIssueRow = typeof newsletterIssues.$inferSelect;
export type NewNewsletterIssueRow = typeof newsletterIssues.$inferInsert;

// One row per (issue, contact) send attempt. The unique (issueId, contactId)
// index is the idempotency anchor: re-enqueuing a send is a no-op, and a retried
// batch skips rows already marked "sent".
export const newsletterSends = pgTable(
  "newsletter_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => newsletterIssues.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending" | "sent" | "failed"
    resendId: text("resend_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    issueContactIdx: uniqueIndex("newsletter_sends_issue_contact_idx").on(
      t.issueId,
      t.contactId,
    ),
    issueStatusIdx: index("newsletter_sends_issue_status_idx").on(
      t.issueId,
      t.status,
    ),
  }),
);

export type NewsletterSendRow = typeof newsletterSends.$inferSelect;
export type NewNewsletterSendRow = typeof newsletterSends.$inferInsert;

// Domain-warmup plan for a staged send. The worker's hourly cron reads the single
// `active` row and, per tick, enqueues up to `chunkSize` more recipients until the
// current day's cap is hit — ramping volume over days instead of one cold blast.
// `dailyCaps` is the per-day cap (e.g. [200,400,700]); once the day index passes
// the array end, the remaining list goes out uncapped ("the rest"). Day index is
// derived from `startAt` (rolling 24h windows). Set `active=false` to pause/stop.
export const newsletterWarmup = pgTable(
  "newsletter_warmup",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => newsletterIssues.id, { onDelete: "cascade" }),
    dailyCaps: jsonb("daily_caps").$type<number[]>().notNull(), // per-day send cap; after last entry = rest
    chunkSize: integer("chunk_size").notNull().default(100), // recipients enqueued per tick
    startAt: timestamp("start_at", { withTimezone: true }).notNull().defaultNow(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("newsletter_warmup_active_idx").on(t.active),
  }),
);

export type NewsletterWarmupRow = typeof newsletterWarmup.$inferSelect;
export type NewNewsletterWarmupRow = typeof newsletterWarmup.$inferInsert;

// First-party engagement events (opens, clicks). We measure these ourselves on
// aibuilders.mx instead of via Resend's tracking (which rewrites links and serves
// a third-party pixel — spam signals). Append-only: one row per event, so we can
// derive CTR / time-to-open / "did they engage" later. Future event types
// (delivered/bounce/complaint via Resend webhooks) reuse this same table.
export const newsletterEvents = pgTable(
  "newsletter_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => newsletterIssues.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "open" | "click" | (future: delivered/bounce/complaint)
    url: text("url"), // click destination, if a click
    userAgent: text("user_agent"), // to filter bot/proxy prefetch later
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    issueTypeIdx: index("newsletter_events_issue_type_idx").on(t.issueId, t.type),
    contactIdx: index("newsletter_events_contact_idx").on(t.contactId),
  }),
);

export type NewsletterEventRow = typeof newsletterEvents.$inferSelect;
export type NewNewsletterEventRow = typeof newsletterEvents.$inferInsert;
