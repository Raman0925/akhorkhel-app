/** Counting screen helpers (pure). */

/** Counting objects only makes sense for small numbers that fit on one screen. */
export const MAX_COUNT = 20;

/** Friendly objects to count when no sticker theme supplies enough variety. */
export const COUNT_OBJECTS: readonly string[] = ['🦏', '🐘', '🦋', '🐟', '🌸', '🥭'];

/**
 * One emoji per object. All objects share one emoji so the child counts "how many" of the same
 * thing; the emoji comes from the active sticker theme, else a fixed set.
 */
export function countObjects(value: number, stickers: readonly string[], seed: number): string[] {
  const pool = stickers.length > 0 ? stickers : COUNT_OBJECTS;
  const emoji = pool[Math.abs(seed) % pool.length] ?? '⭐';
  return Array.from({ length: Math.max(0, Math.min(value, MAX_COUNT)) }, () => emoji);
}
