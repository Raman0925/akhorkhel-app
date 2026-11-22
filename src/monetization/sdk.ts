/**
 * SDK lifecycle. Order is policy-critical: the child-directed request configuration is applied
 * BEFORE `initialize()`, and the SDK is only initialised once ads may actually be shown (parent has
 * seen the notice and this is not the first session of a new install). Never throws.
 */
import mobileAds from 'react-native-google-mobile-ads';

import { useSettings } from '@/storage';

import { USING_TEST_AD_UNITS } from './adUnits';
import { CHILD_DIRECTED_REQUEST_CONFIG, CONFIG_LOG_MESSAGE } from './config';
import { preloadInterstitial, resetInterstitial } from './interstitial';
import { resetRewarded } from './rewarded';
import { currentAdBlockReason, INITIAL_RUNTIME, useAdsRuntime, useAdsStore } from './stores';

let started: Promise<void> | null = null;
let configured: Promise<boolean> | null = null;
let initializing: Promise<boolean> | null = null;
let unsubscribeSettings: (() => void) | null = null;

/** Initialise AdMob in child-directed, G-rated, non-personalised mode. Idempotent; never rejects. */
export function initAds(): Promise<void> {
  started ??= start();
  return started;
}

async function start(): Promise<void> {
  try {
    // One launch per process; the first launch of a new install becomes 1.
    useAdsStore.setState(s => ({ launchCount: s.launchCount + 1 }));
  } catch {
    // Storage failure: the counter stays put, which keeps ads off (fail closed).
  }
  configured = configure();
  await configured;
  await initializeIfAllowed();
  // The notice is usually seen later, behind the parent gate: initialise then.
  unsubscribeSettings = useSettings.subscribe((s, prev) => {
    if (s.adsNoticeSeen && !prev.adsNoticeSeen) {
      initializeIfAllowed().catch(() => undefined);
    }
  });
}

async function configure(): Promise<boolean> {
  try {
    await mobileAds().setRequestConfiguration(CHILD_DIRECTED_REQUEST_CONFIG);
    // Logged in dev AND release so the configuration can be confirmed in logcat.
    console.warn(CONFIG_LOG_MESSAGE);
    if (!__DEV__ && USING_TEST_AD_UNITS) {
      console.warn('[ads] Release build is using Google test ad unit IDs (no release IDs set).');
    }
    return true;
  } catch {
    console.warn('[ads] Could not apply the child-directed configuration; ads stay off.');
    return false;
  }
}

/**
 * Initialises the SDK if the gate allows it. Resolves true once the SDK is ready. Never rejects;
 * offline or failed initialisation resolves false and can be retried by a later trigger.
 */
export function initializeIfAllowed(): Promise<boolean> {
  const runtime = useAdsRuntime.getState();
  if (runtime.sdkReady) {
    return Promise.resolve(true);
  }
  if (initializing) {
    return initializing;
  }
  const config = configured;
  if (!config || currentAdBlockReason() !== null) {
    return Promise.resolve(false);
  }
  initializing = (async () => {
    try {
      if (!(await config)) {
        return false;
      }
      await mobileAds().initialize();
      useAdsRuntime.setState({ sdkReady: true });
      preloadInterstitial();
      return true;
    } catch {
      return false;
    } finally {
      initializing = null;
    }
  })();
  return initializing;
}

/** Tests only: forget everything this module did in the current process. */
export function resetAdsForTests(): void {
  unsubscribeSettings?.();
  unsubscribeSettings = null;
  started = null;
  configured = null;
  initializing = null;
  resetInterstitial();
  resetRewarded();
  useAdsRuntime.setState({ ...INITIAL_RUNTIME });
}
