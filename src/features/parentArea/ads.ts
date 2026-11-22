/**
 * Bridge to the monetization API additions from A8's PR #2: `useUnlocks({ preloadRewarded })` and
 * `resetAdsState()`. They are not on `main` yet, so this file types them locally and stays
 * type-correct both before and after #2 merges.
 * Once #2 is merged, import `useUnlocks` and `resetAdsState` straight from '@/monetization'
 * and delete this file.
 */
import * as monetization from '@/monetization';
import type { UnlocksApi } from '@/monetization';

type UnlocksOptions = { preloadRewarded?: boolean };

/** `useUnlocks`, asking the module to preload a rewarded ad (Rewards screen only). */
export const useUnlocksWithOptions = monetization.useUnlocks as (
  options?: UnlocksOptions,
) => UnlocksApi;

/** Clears in-memory ad counters and unlocks (parent area → delete all data). */
export function resetAdsState(): void {
  const api = monetization as Partial<{ resetAdsState: () => void }>;
  if (typeof api.resetAdsState === 'function') {
    api.resetAdsState();
  } else {
    console.warn('[ads] resetAdsState is not available yet (needs monetization PR #2)');
  }
}
