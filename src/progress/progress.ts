/**
 * Learning progress (frozen contract, owner A0). Stored per profile, per pack, per item key
 * (`letter:<id>`, `sign:<id>`, `number:<n>`, `word:<id>`, `game:<name>`).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from '@/storage/mmkv';

export type Stars = 0 | 1 | 2 | 3;
export type TraceLevel = 1 | 2 | 3;

export type ItemProgress = {
  /** Best stars per level (index 0 = level 1). Non-tracing items use level 1 only. */
  best: [Stars, Stars, Stars];
  attempts: number;
  lastAt: number;
};

/** progress[profileId][packId][itemKey] */
export type ProgressMap = Record<string, Record<string, Record<string, ItemProgress>>>;

type ProgressState = {
  progress: ProgressMap;
  record: (
    profileId: string,
    packId: string,
    itemKey: string,
    level: TraceLevel,
    stars: Stars,
  ) => void;
  clearProfile: (profileId: string) => void;
};

const EMPTY_ITEM: ItemProgress = { best: [0, 0, 0], attempts: 0, lastAt: 0 };
const EMPTY_PACK: Record<string, ItemProgress> = {};

export function applyAttempt(
  prev: ItemProgress | undefined,
  level: TraceLevel,
  stars: Stars,
  now: number,
): ItemProgress {
  const base = prev ?? EMPTY_ITEM;
  const best: [Stars, Stars, Stars] = [base.best[0], base.best[1], base.best[2]];
  const i = level - 1;
  best[i] = Math.max(best[i] ?? 0, stars) as Stars;
  return { best, attempts: base.attempts + 1, lastAt: now };
}

export const useProgress = create<ProgressState>()(
  persist(
    set => ({
      progress: {},
      record: (profileId, packId, itemKey, level, stars) =>
        set(s => {
          const byProfile = s.progress[profileId] ?? {};
          const byPack = byProfile[packId] ?? {};
          return {
            progress: {
              ...s.progress,
              [profileId]: {
                ...byProfile,
                [packId]: {
                  ...byPack,
                  [itemKey]: applyAttempt(byPack[itemKey], level, stars, Date.now()),
                },
              },
            },
          };
        }),
      clearProfile: profileId =>
        set(s => {
          const next = { ...s.progress };
          delete next[profileId];
          return { progress: next };
        }),
    }),
    { name: STORAGE_KEYS.progress, storage: zustandStorage, version: 1 },
  ),
);

/** Best stars across levels for an item (0 if never tried). */
export function bestStars(item: ItemProgress | undefined): Stars {
  if (!item) {
    return 0;
  }
  return Math.max(item.best[0], item.best[1], item.best[2]) as Stars;
}

export function useItemProgress(
  profileId: string | null,
  packId: string,
  itemKey: string,
): ItemProgress | undefined {
  return useProgress(s => (profileId ? s.progress[profileId]?.[packId]?.[itemKey] : undefined));
}

export function usePackProgress(
  profileId: string | null,
  packId: string,
): Record<string, ItemProgress> {
  return useProgress(s => (profileId ? s.progress[profileId]?.[packId] : undefined) ?? EMPTY_PACK);
}
