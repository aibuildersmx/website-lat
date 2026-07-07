import { describe, it, expect, beforeAll } from "vitest";
import {
  unsubToken,
  verifyUnsub,
  unsubscribeUrl,
  unsubscribeHeaders,
  injectUnsubscribe,
} from "@/lib/newsletter/unsubscribe";

beforeAll(() => {
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.NEXT_PUBLIC_SITE_URL = "https://aibuilders.mx";
});

const ID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const ISSUE = "33333333-3333-3333-3333-333333333333";

describe("unsubscribe token", () => {
  it("verifies the token it issues for a contact", () => {
    expect(verifyUnsub(ID, unsubToken(ID))).toBe(true);
  });

  it("verifies issue-scoped tokens", () => {
    const token = unsubToken(ID, ISSUE);
    expect(verifyUnsub(ID, token, ISSUE)).toBe(true);
    expect(verifyUnsub(ID, token)).toBe(false);
    expect(verifyUnsub(ID, token, OTHER)).toBe(false);
  });

  it("rejects a token issued for a different contact", () => {
    expect(verifyUnsub(ID, unsubToken(OTHER))).toBe(false);
  });

  it("rejects tampered or empty tokens", () => {
    expect(verifyUnsub(ID, "deadbeef")).toBe(false);
    expect(verifyUnsub(ID, "")).toBe(false);
    expect(verifyUnsub("", unsubToken(ID))).toBe(false);
  });
});

describe("unsubscribe url + injection", () => {
  it("builds an absolute, self-verifying url", () => {
    const url = unsubscribeUrl(ID, ISSUE);
    expect(url.startsWith("https://aibuilders.mx/unsubscribe?c=" + ID)).toBe(true);
    expect(new URL(url).searchParams.get("i")).toBe(ISSUE);
    const token = new URL(url).searchParams.get("t")!;
    expect(verifyUnsub(ID, token, ISSUE)).toBe(true);
  });

  it("replaces every placeholder occurrence in the html", () => {
    const html = "a {{{RESEND_UNSUBSCRIBE_URL}}} b {{{RESEND_UNSUBSCRIBE_URL}}}";
    const out = injectUnsubscribe(html, ID, ISSUE);
    expect(out).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(out.split(unsubscribeUrl(ID, ISSUE)).length).toBe(3);
  });
});

describe("List-Unsubscribe headers", () => {
  it("emits RFC 8058 one-click headers", () => {
    const h = unsubscribeHeaders(ID, ISSUE);
    expect(h["List-Unsubscribe"]).toBe(`<${unsubscribeUrl(ID, ISSUE)}>`);
    expect(h["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});
