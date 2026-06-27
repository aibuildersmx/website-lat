import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "../../lib/auth/tokens";

describe("session tokens", () => {
  it("generates a long, url-safe-ish hex token", () => {
    const t = generateToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
  });

  it("generates distinct tokens", () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it("hashes deterministically", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("hash differs from input and is 64-char hex", () => {
    const h = hashToken("abc");
    expect(h).not.toBe("abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
