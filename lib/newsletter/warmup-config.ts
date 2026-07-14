export const BATCHED_SEND_DAILY_CAPS = [1_200] as const;
export const BATCHED_SEND_CHUNK_SIZE = 100;

export function warmupSchedule(total: number, dailyCaps: readonly number[]): number[] {
  let remaining = Math.max(0, Math.floor(total));
  const schedule: number[] = [];
  for (const cap of dailyCaps) {
    if (!remaining) break;
    const count = Math.min(remaining, cap);
    schedule.push(count);
    remaining -= count;
  }
  if (remaining) schedule.push(remaining);
  return schedule;
}
