/**
 * Rewarded ad, parent area only (handover 3.2): "watch one ad to unlock X for 24 h". Loaded lazily
 * when a screen using useUnlocks() mounts, once the SDK is ready. Never rejects.
 */
import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

import { AD_UNITS } from './adUnits';
import { now } from './clock';
import { AD_REQUEST_OPTIONS } from './config';
import { isRewardId } from './logic/unlocks';
import { currentAdBlockReason, useAdsRuntime, useUnlocksStore } from './stores';
import type { RewardId } from './types';

let ad: RewardedAd | null = null;
let loading = false;
let showing = false;
let wanted = 0;
let unsubscribeRuntime: (() => void) | null = null;

function setReady(rewardedReady: boolean) {
  useAdsRuntime.setState({ rewardedReady });
}

function create(): RewardedAd {
  const created = RewardedAd.createForAdRequest(AD_UNITS.rewarded, AD_REQUEST_OPTIONS);
  created.addAdEventListener(RewardedAdEventType.LOADED, () => {
    loading = false;
    setReady(true);
  });
  created.addAdEventListener(AdEventType.ERROR, () => {
    // No retry loop: re-opening the parent screen tries again.
    loading = false;
    setReady(false);
  });
  created.addAdEventListener(AdEventType.CLOSED, () => {
    setReady(false);
    if (wanted > 0) {
      load();
    }
  });
  return created;
}

function load() {
  if (loading || showing || !useAdsRuntime.getState().sdkReady || currentAdBlockReason()) {
    return;
  }
  try {
    ad ??= create();
    if (ad.loaded) {
      setReady(true);
      return;
    }
    loading = true;
    ad.load();
  } catch {
    loading = false;
  }
}

/** A screen that offers rewarded unlocks mounted. Returns its cleanup. */
export function requestRewarded(): () => void {
  wanted += 1;
  if (!unsubscribeRuntime) {
    // The SDK may initialise after the screen mounts (e.g. the notice was just accepted).
    unsubscribeRuntime = useAdsRuntime.subscribe((s, prev) => {
      if (s.sdkReady && !prev.sdkReady && wanted > 0) {
        load();
      }
    });
  }
  load();
  return () => {
    wanted = Math.max(0, wanted - 1);
  };
}

/** Shows the rewarded ad; on EARNED_REWARD unlocks `id` for 24 h. Resolves true if earned. */
export async function watchRewarded(id: RewardId): Promise<boolean> {
  try {
    const current = ad;
    if (
      !isRewardId(id) ||
      showing ||
      currentAdBlockReason() !== null ||
      !current ||
      !current.loaded
    ) {
      return false;
    }
    return await show(current, id);
  } catch {
    return false;
  }
}

function show(current: RewardedAd, id: RewardId): Promise<boolean> {
  showing = true;
  setReady(false);
  return new Promise<boolean>(resolve => {
    let earned = false;
    const cleanups: (() => void)[] = [];
    const finish = () => {
      cleanups.forEach(fn => fn());
      cleanups.length = 0;
      showing = false;
      resolve(earned);
      if (wanted > 0) {
        load();
      }
    };
    try {
      cleanups.push(
        current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
          useUnlocksStore.getState().grant(id, now());
        }),
      );
      cleanups.push(current.addAdEventListener(AdEventType.CLOSED, finish));
      cleanups.push(current.addAdEventListener(AdEventType.ERROR, finish));
      current.show().catch(finish);
    } catch {
      finish();
    }
  });
}

/** Tests only. */
export function resetRewarded(): void {
  try {
    ad?.destroy();
  } catch {
    // ignore
  }
  unsubscribeRuntime?.();
  unsubscribeRuntime = null;
  ad = null;
  loading = false;
  showing = false;
  wanted = 0;
}
