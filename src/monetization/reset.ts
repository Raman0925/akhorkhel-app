/**
 * Parent area → "Delete all data" (ADR 0002). Clears the persisted launch counter and the last
 * interstitial time, plus the per-process interstitial count. With the launch counter back at 0 the
 * current process counts as a new install's first session, so no ad shows again until the next
 * launch and the ads notice has been seen again.
 */
import { INITIAL_RUNTIME, useAdsRuntime, useAdsStore } from './stores';

export function resetAdsState(): void {
  try {
    useAdsStore.setState({ launchCount: 0, lastInterstitialAt: null });
    useAdsRuntime.setState({ interstitialsThisSession: INITIAL_RUNTIME.interstitialsThisSession });
  } catch {
    // Never throw from a reset; clearAllData() wipes the storage anyway.
  }
}
