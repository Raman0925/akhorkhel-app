/** Jest helpers for monetization tests. Never imported by app code. */
import { useSettings } from '@/storage';

import { __mock, AdEventType } from '../../jest/mocks/react-native-google-mobile-ads';

import { resetBannerForTests } from './BannerSlot';
import { setClock } from './clock';
import { resetAdsForTests } from './sdk';
import { useAdsStore, useUnlocksStore } from './stores';

export { __mock, AdEventType };

export const T0 = Date.UTC(2026, 10, 22, 9, 0, 0);

/** A controllable clock; returns setters. */
export function fakeClock(start = T0) {
  let t = start;
  setClock(() => t);
  return {
    set: (ms: number) => {
      t = ms;
    },
    advance: (ms: number) => {
      t += ms;
    },
    get: () => t,
  };
}

type Setup = { adsNoticeSeen?: boolean; launchCount?: number };

/**
 * Fresh state. `launchCount` is the persisted value BEFORE initAds() counts this launch, so the
 * default 1 makes this process session 2 (ads allowed once the notice is seen).
 */
export function resetMonetization({ adsNoticeSeen = true, launchCount = 1 }: Setup = {}): void {
  resetAdsForTests();
  resetBannerForTests();
  __mock.reset();
  setClock();
  useSettings.setState({ adsNoticeSeen, stickerTheme: 'stars' });
  useAdsStore.setState({ launchCount, lastInterstitialAt: null });
  useUnlocksStore.setState({ unlocks: {} });
}
