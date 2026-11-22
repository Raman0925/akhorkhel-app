/** Pure rules for 24-hour rewarded unlocks. */
import type { RewardId } from '../types';
import { FREE_STICKER_THEME, STICKER_THEMES, type StickerTheme } from '../stickers';

/** One rewarded ad unlocks its reward for 24 hours. */
export const UNLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export type UnlockMap = Partial<Record<RewardId, number>>;

/** Every reward a parent can unlock: bonus words and each non-free sticker theme. */
export const REWARD_IDS: readonly RewardId[] = [
  'bonusWords',
  ...STICKER_THEMES.filter(t => !t.free).map(t => `theme:${t.id}` as const),
];

export function isRewardId(id: string): id is RewardId {
  return (REWARD_IDS as readonly string[]).includes(id);
}

export function themeRewardId(themeId: string): RewardId {
  return `theme:${themeId}`;
}

/** Expiry (epoch ms) of the reward, or 0 if it is not unlocked at `now`. */
export function unlockedUntil(unlocks: UnlockMap, id: RewardId, now: number): number {
  const until = unlocks[id] ?? 0;
  return until > now ? until : 0;
}

export function isUnlocked(unlocks: UnlockMap, id: RewardId, now: number): boolean {
  return unlockedUntil(unlocks, id, now) > 0;
}

/** New map with `id` unlocked for 24 h from `now`, and expired entries dropped. */
export function grantUnlock(unlocks: UnlockMap, id: RewardId, now: number): UnlockMap {
  const next: UnlockMap = {};
  for (const key of Object.keys(unlocks) as RewardId[]) {
    const until = unlocks[key];
    if (until !== undefined && until > now) {
      next[key] = until;
    }
  }
  next[id] = now + UNLOCK_DURATION_MS;
  return next;
}

/** Earliest future expiry in the map, or null. Used to re-render when an unlock runs out. */
export function nextExpiry(unlocks: UnlockMap, now: number): number | null {
  let next: number | null = null;
  for (const until of Object.values(unlocks)) {
    if (until !== undefined && until > now && (next === null || until < next)) {
      next = until;
    }
  }
  return next;
}

/** The theme whose emoji celebrations use: the selected one if free or unlocked, else stars. */
export function activeStickerTheme(
  selectedId: string,
  unlocks: UnlockMap,
  now: number,
): StickerTheme {
  const theme = STICKER_THEMES.find(t => t.id === selectedId);
  if (!theme) {
    return FREE_STICKER_THEME;
  }
  if (theme.free || isUnlocked(unlocks, themeRewardId(theme.id), now)) {
    return theme;
  }
  return FREE_STICKER_THEME;
}
