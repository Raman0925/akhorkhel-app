/**
 * Bottom banner for MENU screens only. The slot always reserves BANNER_HEIGHT so the layout never
 * jumps; the ad sits under a thin divider so it is clearly separate from the lesson UI. On error or
 * offline it shows nothing (the reserved space stays empty) and it never reloads in a loop.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { BANNER_HEIGHT, colors } from '@/theme';

import { AD_UNITS } from './adUnits';
import { now } from './clock';
import { AD_REQUEST_OPTIONS } from './config';
import { useAdsAvailable } from './stores';

export const DIVIDER_HEIGHT = 1;
/** Height the ad itself may use inside the reserved slot. */
export const AD_MAX_HEIGHT = BANNER_HEIGHT - DIVIDER_HEIGHT;
/** After a failed load, banners stay off this long (no request loops while offline). */
export const BANNER_RETRY_AFTER_MS = 60 * 1000;

/**
 * Anchored adaptive banners are sized by width (about 50 dp per 320 dp of width, between 50 and
 * 90 dp). Cap the requested width so the returned height fits the reserved slot; if the SDK still
 * returns something taller, fall back once to the fixed 320x50 banner instead of growing the slot.
 */
export function adaptiveWidthFor(screenWidth: number): number {
  const widthThatFits = Math.floor((AD_MAX_HEIGHT * 320) / 50);
  return Math.min(Math.floor(screenWidth), widthThatFits);
}

let lastFailureAt: number | null = null;

/** Tests only. */
export function resetBannerForTests(): void {
  lastFailureAt = null;
}

function recentlyFailed(): boolean {
  return lastFailureAt !== null && now() - lastFailureAt < BANNER_RETRY_AFTER_MS;
}

type Phase = 'loading' | 'loaded' | 'failed';

export function BannerSlot(): React.JSX.Element {
  const available = useAdsAvailable();
  const { width } = useWindowDimensions();
  // A failed slot stays empty until it remounts (e.g. Home, the stack root, until the next launch).
  // Deliberate: no timers, no retry loops while offline.
  const [phase, setPhase] = useState<Phase>(() => (recentlyFailed() ? 'failed' : 'loading'));
  const [fixedSize, setFixedSize] = useState(false);

  const checkFits = useCallback(
    (dims: { height: number }) => {
      if (dims.height > AD_MAX_HEIGHT && !fixedSize) {
        setFixedSize(true);
        setPhase('loading');
        return false;
      }
      return true;
    },
    [fixedSize],
  );

  const onAdLoaded = useCallback(
    (dims: { width: number; height: number }) => {
      if (checkFits(dims)) {
        setPhase('loaded');
      }
    },
    [checkFits],
  );

  const onAdFailedToLoad = useCallback(() => {
    lastFailureAt = now();
    setPhase('failed');
  }, []);

  const showAd = available && phase !== 'failed';

  return (
    <View style={styles.slot} testID="banner-slot">
      {showAd ? (
        <>
          <View
            style={[styles.divider, phase !== 'loaded' && styles.hidden]}
            testID="banner-divider"
          />
          <View style={styles.adBox}>
            <BannerAd
              key={fixedSize ? 'fixed' : 'adaptive'}
              unitId={AD_UNITS.banner}
              size={fixedSize ? BannerAdSize.BANNER : BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              width={fixedSize ? undefined : adaptiveWidthFor(width)}
              requestOptions={AD_REQUEST_OPTIONS}
              onAdLoaded={onAdLoaded}
              onSizeChange={checkFits}
              onAdFailedToLoad={onAdFailedToLoad}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: BANNER_HEIGHT, overflow: 'hidden' },
  divider: { height: DIVIDER_HEIGHT, backgroundColor: colors.border },
  hidden: { opacity: 0 },
  adBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
