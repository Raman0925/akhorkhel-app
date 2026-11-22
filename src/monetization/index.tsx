/**
 * The ONLY entry point for ads (handover section 3). Screens import from '@/monetization', never from
 * react-native-google-mobile-ads (enforced by ESLint).
 *
 * STUB: A8 replaces the implementation; the exported names and types are frozen.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { BANNER_HEIGHT } from '@/theme';

import type { AdsApi, RewardId, UnlocksApi } from './types';

export type { AdsApi, RewardId, UnlocksApi } from './types';

/** Initialise AdMob in child-directed, G-rated, non-personalised mode. Safe to call more than once. */
export async function initAds(): Promise<void> {}

/**
 * Bottom banner for MENU screens only (home, grids, lists, parent area). Always reserves its height
 * so the layout never jumps. Never use on tracing or game screens.
 */
export function BannerSlot(): React.JSX.Element {
  return <View style={styles.slot} testID="banner-slot" />;
}

export function useAds(): AdsApi {
  return { onSetComplete: async () => {} };
}

export function useUnlocks(): UnlocksApi {
  return {
    isUnlocked: (_id: RewardId) => false,
    unlockedUntil: (_id: RewardId) => 0,
    watchRewarded: async (_id: RewardId) => false,
    rewardedReady: false,
  };
}

const styles = StyleSheet.create({ slot: { height: BANNER_HEIGHT } });
