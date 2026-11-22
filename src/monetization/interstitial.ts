/**
 * Interstitial after a finished set (handover 3.2). Preloaded once the SDK is ready; shown only if
 * the caps in logic/caps.ts allow it and an ad is already loaded. Never blocks the UI.
 */
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import { useSettings } from '@/storage';

import { AD_UNITS } from './adUnits';
import { now } from './clock';
import { AD_REQUEST_OPTIONS } from './config';
import { interstitialBlockReason } from './logic/caps';
import { useAdsRuntime, useAdsStore } from './stores';

/** If the SDK never reports CLOSED, stop waiting after this long so the app can never hang. */
export const SHOW_SAFETY_TIMEOUT_MS = 2 * 60 * 1000;

let ad: InterstitialAd | null = null;
let loading = false;
let showing = false;

function setReady(interstitialReady: boolean) {
  useAdsRuntime.setState({ interstitialReady });
}

function create(): InterstitialAd {
  const created = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, AD_REQUEST_OPTIONS);
  created.addAdEventListener(AdEventType.LOADED, () => {
    loading = false;
    setReady(true);
  });
  created.addAdEventListener(AdEventType.ERROR, () => {
    // No retry loop: the next finished set triggers one new load attempt.
    loading = false;
    setReady(false);
  });
  created.addAdEventListener(AdEventType.CLOSED, () => {
    setReady(false);
    // Warm the next one; caps still decide whether it may ever show.
    load();
  });
  return created;
}

function load() {
  if (!ad || loading || ad.loaded || !useAdsRuntime.getState().sdkReady) {
    return;
  }
  loading = true;
  try {
    ad.load();
  } catch {
    loading = false;
  }
}

/** Called once the SDK is initialised. */
export function preloadInterstitial(): void {
  try {
    ad ??= create();
    load();
  } catch {
    ad = null;
    loading = false;
  }
}

/**
 * `useAds().onSetComplete`. Resolves immediately when no ad may or can show; otherwise resolves
 * after the ad closes (or fails to show). Never rejects.
 */
export async function onSetComplete(): Promise<void> {
  try {
    if (showing) {
      return;
    }
    const runtime = useAdsRuntime.getState();
    const blocked = interstitialBlockReason({
      adsNoticeSeen: useSettings.getState().adsNoticeSeen,
      launchCount: useAdsStore.getState().launchCount,
      now: now(),
      lastInterstitialAt: useAdsStore.getState().lastInterstitialAt,
      shownThisSession: runtime.interstitialsThisSession,
    });
    if (blocked || !runtime.sdkReady) {
      return;
    }
    const current = ad;
    if (!current || !current.loaded) {
      // Not ready: never make the child wait. Try to have one ready next time.
      preloadInterstitial();
      return;
    }
    await show(current);
  } catch {
    // Ads fail silently.
  }
}

function show(current: InterstitialAd): Promise<void> {
  showing = true;
  // Count the impression attempt up front so caps hold even if CLOSED never arrives.
  useAdsRuntime.setState(s => ({ interstitialsThisSession: s.interstitialsThisSession + 1 }));
  useAdsStore.setState({ lastInterstitialAt: now() });
  setReady(false);

  return new Promise<void>(resolve => {
    const cleanups: (() => void)[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const done = () => {
      if (timer) {
        clearTimeout(timer);
      }
      cleanups.forEach(fn => fn());
      cleanups.length = 0;
      showing = false;
      resolve();
    };
    try {
      cleanups.push(current.addAdEventListener(AdEventType.CLOSED, done));
      cleanups.push(current.addAdEventListener(AdEventType.ERROR, done));
      timer = setTimeout(done, SHOW_SAFETY_TIMEOUT_MS);
      current.show().catch(done);
    } catch {
      done();
    }
  });
}

/** Tests only. */
export function resetInterstitial(): void {
  try {
    ad?.destroy();
  } catch {
    // ignore
  }
  ad = null;
  loading = false;
  showing = false;
}
