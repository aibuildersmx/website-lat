import { describe, it, expect, beforeEach, vi } from "vitest";

const upsertSubscriber = vi.fn();
const rateLimit = vi.fn();
const headers = vi.fn();

vi.mock("@/lib/db/queries/subscribers", () => ({ upsertSubscriber }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("next/headers", () => ({ headers }));

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockReturnValue(true);
    upsertSubscriber.mockResolvedValue(undefined);
    headers.mockResolvedValue(new Map([["x-forwarded-for", "1.2.3.4"]]));
  });

  it("subscribes a valid email", async () => {
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(await subscribe(fd({ email: "Foo@Bar.com" }))).toEqual({ ok: true });
    expect(upsertSubscriber).toHaveBeenCalledWith("foo@bar.com", {
      source: undefined,
      medium: undefined,
      campaign: undefined,
      content: undefined,
      term: undefined,
      referrer: undefined,
      landingPage: undefined,
    }); // normalized
  });

  it("passes signup attribution from UTM and referrer fields", async () => {
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(
      await subscribe(
        fd({
          email: "a@b.com",
          utm_source: "linkedin",
          utm_medium: "paid-social",
          utm_campaign: "launch",
          utm_content: "hero",
          utm_term: "ai builders",
          attribution_referrer: "https://example.com/post",
          attribution_landing_page: "https://aibuilders.mx/?utm_source=linkedin",
        }),
      ),
    ).toEqual({ ok: true });

    expect(upsertSubscriber).toHaveBeenCalledWith("a@b.com", {
      source: "linkedin",
      medium: "paid-social",
      campaign: "launch",
      content: "hero",
      term: "ai builders",
      referrer: "https://example.com/post",
      landingPage: "https://aibuilders.mx/?utm_source=linkedin",
    });
  });

  it("falls back to the referrer host when no source is tagged", async () => {
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(
      await subscribe(fd({ email: "a@b.com", attribution_referrer: "https://www.partner.com/a" })),
    ).toEqual({ ok: true });

    expect(upsertSubscriber).toHaveBeenCalledWith(
      "a@b.com",
      expect.objectContaining({ source: "partner.com" }),
    );
  });

  it("silently succeeds and writes nothing when the honeypot is filled", async () => {
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(await subscribe(fd({ email: "a@b.com", company: "Acme" }))).toEqual({ ok: true });
    expect(upsertSubscriber).not.toHaveBeenCalled();
  });

  it("rejects an invalid email without writing", async () => {
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(await subscribe(fd({ email: "not-an-email" }))).toEqual({ ok: false, error: "invalid" });
    expect(upsertSubscriber).not.toHaveBeenCalled();
  });

  it("rejects an empty email", async () => {
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(await subscribe(fd({ email: "   " }))).toEqual({ ok: false, error: "invalid" });
  });

  it("returns rate_limited when the limiter blocks, without writing", async () => {
    rateLimit.mockReturnValue(false);
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(await subscribe(fd({ email: "a@b.com" }))).toEqual({ ok: false, error: "rate_limited" });
    expect(upsertSubscriber).not.toHaveBeenCalled();
  });

  it("returns error when the DB write throws", async () => {
    upsertSubscriber.mockRejectedValue(new Error("db down"));
    const { subscribe } = await import("@/lib/actions/subscribe");
    expect(await subscribe(fd({ email: "a@b.com" }))).toEqual({ ok: false, error: "error" });
  });
});
