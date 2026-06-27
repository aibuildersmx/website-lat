// Pure, in-memory fixed-window rate limiter. Good enough on a single Railway
// instance; the Map is process-local. Swap the store here (not at call sites)
// if we ever run multiple instances.
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/**
 * Returns true if the call is allowed, false if `key` has already made `limit`
 * calls within the current `windowMs` window. `now` is injectable for tests.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const existing = windows.get(key);
  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
