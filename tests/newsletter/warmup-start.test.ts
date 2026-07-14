import { describe, expect, it } from "vitest";
import {
  BATCHED_SEND_CHUNK_SIZE,
  BATCHED_SEND_DAILY_CAPS,
  warmupSchedule,
} from "@/lib/newsletter/warmup-config";

describe("newsletter warm-up start configuration", () => {
  it("uses the established 1,200 then remainder plan", () => {
    expect(BATCHED_SEND_DAILY_CAPS).toEqual([1_200]);
    expect(BATCHED_SEND_CHUNK_SIZE).toBe(100);
    expect(warmupSchedule(2_403, BATCHED_SEND_DAILY_CAPS)).toEqual([1_200, 1_203]);
  });

  it("does not invent an extra day when a cap finishes the audience", () => {
    expect(warmupSchedule(1_000, [1_200])).toEqual([1_000]);
  });
});
