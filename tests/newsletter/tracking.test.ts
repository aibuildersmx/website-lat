import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.NEXT_PUBLIC_SITE_URL = "https://aibuilders.lat";
});

import { resolveRedirect, wrapEmailLinks } from "@/lib/newsletter/links";
import { injectTracking } from "@/lib/newsletter/tracking";

const CONTACT_ID = "11111111-1111-1111-1111-111111111111";
const ISSUE_ID = "22222222-2222-2222-2222-222222222222";

describe("newsletter click tracking", () => {
  it("wraps composer-authored external links and records recipient attribution", () => {
    const html = [
      '<a href="https://example.com/article?source=newsletter&amp;campaign=weekly">Read</a>',
      '<a href="https://aibuilders.lat/newsletters">Archive</a>',
      '<a href="mailto:hola@aibuilders.lat">Email us</a>',
    ].join("");

    const sent = injectTracking(wrapEmailLinks(html), CONTACT_ID, ISSUE_ID);
    const [trackedHref, siteHref] = [...sent.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

    expect(trackedHref).toBeTruthy();
    const tracked = new URL(trackedHref!);
    expect(tracked.origin).toBe("https://aibuilders.lat");
    expect(tracked.pathname).toMatch(/^\/r\//);
    expect(tracked.searchParams.get("c")).toBe(CONTACT_ID);
    expect(tracked.searchParams.get("i")).toBe(ISSUE_ID);
    expect(resolveRedirect(tracked.pathname.split("/").pop()!, tracked.searchParams.get("s")!)).toBe(
      "https://example.com/article?source=newsletter&campaign=weekly",
    );

    expect(resolveRedirect(new URL(siteHref!).pathname.split("/").pop()!, new URL(siteHref!).searchParams.get("s")!)).toBe(
      "https://aibuilders.lat/newsletters",
    );
    expect(sent).not.toContain('href="https://aibuilders.lat/newsletters"');
    expect(sent).toContain('href="mailto:hola@aibuilders.lat"');
  });

  it("does not double-wrap links that were imported through the redirector", () => {
    const once = wrapEmailLinks('<a href="https://example.com/article">Read</a>');
    expect(wrapEmailLinks(once)).toBe(once);
  });
});
