/**
 * The ONLY entry point for ads (handover section 3). Screens import from '@/monetization', never from
 * react-native-google-mobile-ads (enforced by ESLint). Policy details: docs/ads.md.
 *
 * Frozen contract: exported names and types must not change without an ADR.
 */
import { useSettings } from '@/storage';

import { onSetComplete } from './interstitial';
import { resetAdsState } from './reset';
import { stickerTheme } from './stickers';
import type { AdsApi } from './types';

export type { AdsApi } from './types';
export { resetAdsState };
export { initAds } from './sdk';
export { BannerSlot } from './BannerSlot';
export { STICKER_THEMES, type StickerTheme } from './stickers';

const ADS_API: AdsApi = { onSetComplete };

/** `onSetComplete()` for the letter grid: may show a capped interstitial, never blocks. */
export function useAds(): AdsApi {
  return ADS_API;
}

/** Emoji for celebrations: the theme the parent selected (all themes are free). */
export function useActiveStickers(): readonly string[] {
  const selected = useSettings(s => s.stickerTheme);
  // Theme emoji arrays are module constants, so the returned reference is stable.
  return stickerTheme(selected).emoji;
}
