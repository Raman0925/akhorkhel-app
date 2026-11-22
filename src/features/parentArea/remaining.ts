/** Splits the time left until `until` into whole hours and minutes (rounded up to the minute). */
export function remaining(until: number, now: number): { h: number; m: number } | null {
  const ms = until - now;
  if (ms <= 0) {
    return null;
  }
  const totalMinutes = Math.ceil(ms / 60000);
  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 };
}
