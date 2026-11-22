/**
 * The ONLY entry point for ads (handover section 3). Screens import from '@/monetization', never from
 * react-native-google-mobile-ads (enforced by ESLint). Policy details: docs/ads.md.
 *
 * Frozen contract: exported names and types must not change without an ADR.
 */
import { useEffect, useState } from 'react';

import { useSettings } from '@/storage';

import { now } from './clock';
import { onSetComplete } from './interstitial';
import {
  activeStickerTheme,
  isUnlocked,
  nextExpiry,
  unlockedUntil,
  type UnlockMap,
} from './logic/unlocks';
import { requestRewarded, watchRewarded } from './rewarded';
import { resetAdsState } from './reset';
import { useAdsAvailable, useAdsRuntime, useUnlocksStore } from './stores';
import type { AdsApi, RewardId, UnlocksApi, UnlocksOptions } from './types';

export type { AdsApi, RewardId, UnlocksApi, UnlocksOptions } from './types';
export { resetAdsState };
export { initAds } from './sdk';
export { BannerSlot } from './BannerSlot';
export { STICKER_THEMES, type StickerTheme } from './stickers';

const ADS_API: AdsApi = { onSetComplete };

/** `onSetComplete()` for the letter grid: may show a capped interstitial, never blocks. */
export function useAds(): AdsApi {
  return ADS_API;
}

/** Re-renders when the earliest unlock expires, so expired unlocks disappear on their own. */
function useExpiryTick(unlocks: UnlockMap): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const expiry = nextExpiry(unlocks, now());
    if (expiry === null) {
      return;
    }
    // setTimeout delays above 2^31-1 ms overflow; 24 h is well below, but clamp anyway.
    const delay = Math.min(Math.max(expiry - now(), 0) + 50, 2 ** 31 - 1);
    const timer = setTimeout(() => setTick(t => t + 1), delay);
    return () => clearTimeout(timer);
  });
}

/**
 * Unlock state for any screen. Only the parent-area Rewards screen passes
 * `{ preloadRewarded: true }`, which loads a rewarded ad while mounted (ADR 0002).
 */
export function useUnlocks(options?: UnlocksOptions): UnlocksApi {
  const preload = options?.preloadRewarded === true;
  const unlocks = useUnlocksStore(s => s.unlocks);
  const rewardedReady = useAdsRuntime(s => s.rewardedReady);
  const available = useAdsAvailable();
  useExpiryTick(unlocks);

  useEffect(() => (preload ? requestRewarded() : undefined), [preload]);

  return {
    isUnlocked: (id: RewardId) => isUnlocked(unlocks, id, now()),
    unlockedUntil: (id: RewardId) => unlockedUntil(unlocks, id, now()),
    watchRewarded,
    rewardedReady: preload && available && rewardedReady,
  };
}

/** Emoji for celebrations: the selected theme if it is free or currently unlocked, else stars. */
export function useActiveStickers(): readonly string[] {
  const selected = useSettings(s => s.stickerTheme);
  const unlocks = useUnlocksStore(s => s.unlocks);
  useExpiryTick(unlocks);
  // Theme emoji arrays are module constants, so the returned reference is stable.
  return activeStickerTheme(selected, unlocks, now()).emoji;
}
