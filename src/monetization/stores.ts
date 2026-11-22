/** Monetization state. Persisted parts live on-device in MMKV; nothing is ever sent anywhere. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, useSettings, zustandStorage } from '@/storage';

import { adBlockReason, type AdBlockReason } from './logic/caps';
import { grantUnlock, type UnlockMap } from './logic/unlocks';
import type { RewardId } from './types';

type AdsPersisted = {
  /** App launches counted by initAds(); the first launch of a new install is 1. */
  launchCount: number;
  /** Epoch ms of the last interstitial shown (kept across restarts for the 4-minute cap). */
  lastInterstitialAt: number | null;
};

export const useAdsStore = create<AdsPersisted>()(
  persist((): AdsPersisted => ({ launchCount: 0, lastInterstitialAt: null }), {
    name: STORAGE_KEYS.ads,
    storage: zustandStorage,
    version: 1,
  }),
);

type UnlocksPersisted = {
  unlocks: UnlockMap;
  grant: (id: RewardId, now: number) => void;
};

export const useUnlocksStore = create<UnlocksPersisted>()(
  persist(
    set => ({
      unlocks: {},
      grant: (id, now) => set(s => ({ unlocks: grantUnlock(s.unlocks, id, now) })),
    }),
    {
      name: STORAGE_KEYS.unlocks,
      storage: zustandStorage,
      version: 1,
      partialize: s => ({ unlocks: s.unlocks }),
    },
  ),
);

/** In-memory, per-process state (an "app session" is the process lifetime). */
type AdsRuntime = {
  sdkReady: boolean;
  interstitialReady: boolean;
  rewardedReady: boolean;
  interstitialsThisSession: number;
};

export const INITIAL_RUNTIME: AdsRuntime = {
  sdkReady: false,
  interstitialReady: false,
  rewardedReady: false,
  interstitialsThisSession: 0,
};

export const useAdsRuntime = create<AdsRuntime>()(() => ({ ...INITIAL_RUNTIME }));

/** Current gate for every ad format (notice seen, not the first session). */
export function currentAdBlockReason(): AdBlockReason | null {
  return adBlockReason({
    adsNoticeSeen: useSettings.getState().adsNoticeSeen,
    launchCount: useAdsStore.getState().launchCount,
  });
}

/** React hook: ads may be shown now (gate passed and SDK initialised). */
export function useAdsAvailable(): boolean {
  const adsNoticeSeen = useSettings(s => s.adsNoticeSeen);
  const launchCount = useAdsStore(s => s.launchCount);
  const sdkReady = useAdsRuntime(s => s.sdkReady);
  return sdkReady && adBlockReason({ adsNoticeSeen, launchCount }) === null;
}
