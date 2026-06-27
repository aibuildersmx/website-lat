"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { upsertSubscriber } from "@/lib/db/queries/subscribers";

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rate_limited" | "error" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT = 5; // signups
const RATE_WINDOW_MS = 60_000; // per minute, per IP

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
    await upsertSubscriber(email);
  } catch (error) {
    console.error("subscribe failed:", error);
    return { ok: false, error: "error" };
  }
  return { ok: true };
}
