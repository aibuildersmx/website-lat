"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { upsertSubscriber } from "@/lib/db/queries/subscribers";
import type { SubscriberAttribution } from "@/lib/db/queries/subscribers";

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rate_limited" | "error" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = 5; // signups
const RATE_WINDOW_MS = 60_000; // per minute, per IP
const MAX_ATTRIBUTION_LENGTH = 500;

function cleanAttributionValue(value: FormDataEntryValue | null, max = MAX_ATTRIBUTION_LENGTH) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function hostnameFromUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function attributionFromForm(formData: FormData): SubscriberAttribution {
  const referrer = cleanAttributionValue(formData.get("attribution_referrer"));
  const landingPage = cleanAttributionValue(formData.get("attribution_landing_page"));
  const explicitSource =
    cleanAttributionValue(formData.get("utm_source"), 120) ??
    cleanAttributionValue(formData.get("ref"), 120);

  return {
    source: explicitSource ?? hostnameFromUrl(referrer),
    medium: cleanAttributionValue(formData.get("utm_medium"), 120),
    campaign: cleanAttributionValue(formData.get("utm_campaign"), 200),
    content: cleanAttributionValue(formData.get("utm_content"), 200),
    term: cleanAttributionValue(formData.get("utm_term"), 200),
    referrer,
    landingPage,
  };
}

export async function subscribe(formData: FormData): Promise<SubscribeResult> {
  // Honeypot: a hidden field humans never see. Bots autofill it — pretend it
  // worked and write nothing.
  const honeypot = (formData.get("company") as string | null)?.trim();
  if (honeypot) return { ok: true };

  const raw = (formData.get("email") as string | null)?.trim() ?? "";
  if (!raw || !EMAIL_RE.test(raw)) return { ok: false, error: "invalid" };
  const email = raw.toLowerCase();

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!rateLimit(`subscribe:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return { ok: false, error: "rate_limited" };
  }

  try {
    await upsertSubscriber(email, attributionFromForm(formData));
  } catch (error) {
    console.error("subscribe failed:", error);
    return { ok: false, error: "error" };
  }
  return { ok: true };
}
