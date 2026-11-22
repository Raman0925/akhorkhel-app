/**
 * Ad unit IDs (ADR 0001 point 6). Debug builds always use Google's test IDs. Release builds use the
 * IDs that CI writes into adUnits.generated.ts on tag builds; any missing ID falls back to a test ID.
 */
import { TestIds } from 'react-native-google-mobile-ads';

import { GENERATED_AD_UNITS } from './adUnits.generated';

export type AdUnits = { banner: string; interstitial: string; rewarded: string };
export type GeneratedAdUnits = { [K in keyof AdUnits]: string | null };

export const TEST_AD_UNITS: AdUnits = {
  banner: TestIds.ADAPTIVE_BANNER,
  interstitial: TestIds.INTERSTITIAL,
  rewarded: TestIds.REWARDED,
};

export function resolveAdUnits(isDev: boolean, generated: GeneratedAdUnits): AdUnits {
  if (isDev) {
    return TEST_AD_UNITS;
  }
  return {
    banner: generated.banner ?? TEST_AD_UNITS.banner,
    interstitial: generated.interstitial ?? TEST_AD_UNITS.interstitial,
    rewarded: generated.rewarded ?? TEST_AD_UNITS.rewarded,
  };
}

export const AD_UNITS: AdUnits = resolveAdUnits(__DEV__, GENERATED_AD_UNITS);

/** True when at least one placement is using a Google test ID. */
export const USING_TEST_AD_UNITS = (Object.keys(AD_UNITS) as (keyof AdUnits)[]).some(
  k => AD_UNITS[k] === TEST_AD_UNITS[k],
);
