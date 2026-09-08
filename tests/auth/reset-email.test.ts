import { afterEach, describe, expect, it } from "vitest";
import { passwordResetEmail, passwordResetUrl } from "@/lib/auth/reset-email";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("password reset email", () => {
  it("builds a reset link on the configured site", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://aibuilders.lat";
    const url = passwordResetUrl("a".repeat(64));

    expect(url).toBe(`https://aibuilders.lat/reset-password?token=${"a".repeat(64)}`);
  });

  it("includes the one-hour, single-use link in text and HTML", () => {
    const url = `https://aibuilders.lat/reset-password?token=${"b".repeat(64)}`;
    const email = passwordResetEmail(url);

    expect(email.subject).toContain("contraseña");
    expect(email.text).toContain(url);
    expect(email.text).toContain("vence en una hora");
    expect(email.html).toContain(`href="${url}"`);
  });
});
