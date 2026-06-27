import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to `limit` calls in a window, then blocks", () => {
    const key = "ip-a";
    const t0 = 1_000_000;
    expect(rateLimit(key, 3, 60_000, t0)).toBe(true);
    expect(rateLimit(key, 3, 60_000, t0 + 1)).toBe(true);
    expect(rateLimit(key, 3, 60_000, t0 + 2)).toBe(true);
    expect(rateLimit(key, 3, 60_000, t0 + 3)).toBe(false); // 4th call blocked
  });

  it("resets after the window elapses", () => {
    const key = "ip-b";
    const t0 = 2_000_000;
    expect(rateLimit(key, 1, 60_000, t0)).toBe(true);
    expect(rateLimit(key, 1, 60_000, t0 + 100)).toBe(false);
    expect(rateLimit(key, 1, 60_000, t0 + 60_001)).toBe(true); // new window
  });

  it("tracks keys independently", () => {
    const t0 = 3_000_000;
    expect(rateLimit("ip-c", 1, 60_000, t0)).toBe(true);
    expect(rateLimit("ip-d", 1, 60_000, t0)).toBe(true);
    expect(rateLimit("ip-c", 1, 60_000, t0 + 1)).toBe(false);
  });
});
