import { act, renderHook } from '@testing-library/react-native';

import { mmkv, STORAGE_KEYS, useSettings } from '@/storage';

import { initAds, resetAdsState, STICKER_THEMES, useActiveStickers, useUnlocks } from '..';
import {
  activeStickerTheme,
  grantUnlock,
  isRewardId,
  isUnlocked,
  nextExpiry,
  REWARD_IDS,
  UNLOCK_DURATION_MS,
  unlockedUntil,
} from '../logic/unlocks';
import { useAdsRuntime, useAdsStore, useUnlocksStore } from '../stores';
import { __mock, AdEventType, fakeClock, resetMonetization, T0 } from '../testing';

const HOUR = 60 * 60 * 1000;

let warn: jest.SpyInstance;
beforeEach(() => {
  resetMonetization();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

describe('unlock rules (pure)', () => {
  it('reward ids are bonusWords plus every non-free theme', () => {
    expect(REWARD_IDS).toEqual(['bonusWords', 'theme:animals', 'theme:fruits', 'theme:festival']);
    expect(isRewardId('theme:stars')).toBe(false);
    expect(isRewardId('theme:nope')).toBe(false);
  });

  it('unlocks for exactly 24 hours', () => {
    const map = grantUnlock({}, 'bonusWords', T0);
    expect(UNLOCK_DURATION_MS).toBe(24 * HOUR);
    expect(unlockedUntil(map, 'bonusWords', T0)).toBe(T0 + 24 * HOUR);
    expect(isUnlocked(map, 'bonusWords', T0 + 24 * HOUR - 1)).toBe(true);
    expect(isUnlocked(map, 'bonusWords', T0 + 24 * HOUR)).toBe(false);
    expect(unlockedUntil(map, 'bonusWords', T0 + 24 * HOUR)).toBe(0);
    expect(unlockedUntil(map, 'theme:animals', T0)).toBe(0);
  });

  it('re-granting extends from now and drops expired entries', () => {
    const a = grantUnlock({}, 'theme:animals', T0);
    const b = grantUnlock(a, 'bonusWords', T0 + 25 * HOUR);
    expect(b).toEqual({ bonusWords: T0 + 49 * HOUR });
    expect(nextExpiry(b, T0 + 25 * HOUR)).toBe(T0 + 49 * HOUR);
    expect(nextExpiry({}, T0)).toBeNull();
  });

  it('active sticker theme falls back to stars unless free or unlocked', () => {
    const stars = STICKER_THEMES[0];
    const map = grantUnlock({}, 'theme:fruits', T0);
    expect(activeStickerTheme('fruits', map, T0 + HOUR).id).toBe('fruits');
    expect(activeStickerTheme('fruits', map, T0 + 25 * HOUR)).toBe(stars);
    expect(activeStickerTheme('animals', map, T0)).toBe(stars);
    expect(activeStickerTheme('missing', map, T0)).toBe(stars);
    expect(activeStickerTheme('stars', {}, T0)).toBe(stars);
  });
});

describe('useUnlocks', () => {
  async function mountReady() {
    const clock = fakeClock();
    await initAds();
    const hook = await renderHook(() => useUnlocks({ preloadRewarded: true }));
    return { clock, hook };
  }

  it('does not load a rewarded ad by default (child screens only read state)', async () => {
    await initAds();
    const { result, unmount } = await renderHook(() => useUnlocks());
    expect(__mock.lastRewarded()).toBeUndefined();
    expect(result.current.rewardedReady).toBe(false);
    await expect(result.current.watchRewarded('bonusWords')).resolves.toBe(false);
    await unmount();
  });

  it('stops reloading once the preloading screen unmounts', async () => {
    const { hook } = await mountReady();
    const ad = __mock.lastRewarded();
    await act(async () => ad?.simulateLoaded());
    let earned: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      earned = hook.result.current.watchRewarded('bonusWords');
    });
    await hook.unmount();
    await act(async () => ad?.emit(AdEventType.CLOSED));
    await earned;
    expect(ad?.loadCalls).toBe(1);
  });

  it('preloads only with { preloadRewarded: true } and reports readiness', async () => {
    await initAds();
    expect(__mock.lastRewarded()).toBeUndefined();
    const { result } = await renderHook(() => useUnlocks({ preloadRewarded: true }));
    const ad = __mock.lastRewarded();
    expect(ad?.loadCalls).toBe(1);
    expect(ad?.requestOptions).toEqual({ requestNonPersonalizedAdsOnly: true });
    expect(result.current.rewardedReady).toBe(false);
    await act(async () => ad?.simulateLoaded());
    expect(result.current.rewardedReady).toBe(true);
  });

  it('unlocks for 24 h on EARNED_REWARD and persists it', async () => {
    const { clock, hook } = await mountReady();
    const ad = __mock.lastRewarded();
    await act(async () => ad?.simulateLoaded());

    let earned: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      earned = hook.result.current.watchRewarded('theme:animals');
    });
    await act(async () => {
      ad?.simulateEarnedReward();
      ad?.emit(AdEventType.CLOSED);
    });
    await expect(earned).resolves.toBe(true);

    expect(hook.result.current.isUnlocked('theme:animals')).toBe(true);
    expect(hook.result.current.unlockedUntil('theme:animals')).toBe(T0 + 24 * HOUR);
    expect(useUnlocksStore.getState().unlocks).toEqual({ 'theme:animals': T0 + 24 * HOUR });

    clock.advance(24 * HOUR);
    await hook.rerender({});
    expect(hook.result.current.isUnlocked('theme:animals')).toBe(false);
    expect(hook.result.current.unlockedUntil('theme:animals')).toBe(0);
  });

  it('grants nothing when the ad is closed early', async () => {
    const { hook } = await mountReady();
    const ad = __mock.lastRewarded();
    await act(async () => ad?.simulateLoaded());
    let earned: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      earned = hook.result.current.watchRewarded('bonusWords');
    });
    await act(async () => ad?.emit(AdEventType.CLOSED));
    await expect(earned).resolves.toBe(false);
    expect(hook.result.current.isUnlocked('bonusWords')).toBe(false);
    // Reloads for the next offer.
    expect(ad?.loadCalls).toBe(2);
  });

  it('resolves false when nothing is loaded or the id is not a reward', async () => {
    const { hook } = await mountReady();
    await expect(hook.result.current.watchRewarded('bonusWords')).resolves.toBe(false);
    await act(async () => __mock.lastRewarded()?.simulateLoaded());
    await expect(hook.result.current.watchRewarded('theme:stars')).resolves.toBe(false);
    expect(__mock.lastRewarded()?.showCalls).toBe(0);
  });

  it('offers nothing before the ads notice or in the first session', async () => {
    resetMonetization({ adsNoticeSeen: false });
    await initAds();
    const { result } = await renderHook(() => useUnlocks({ preloadRewarded: true }));
    expect(__mock.lastRewarded()).toBeUndefined();
    expect(result.current.rewardedReady).toBe(false);
    await expect(result.current.watchRewarded('bonusWords')).resolves.toBe(false);

    // Accepting the notice initialises the SDK and loads the mounted screen's ad.
    await act(async () => useSettings.getState().markAdsNoticeSeen());
    expect(__mock.lastRewarded()?.loadCalls).toBe(1);
  });
});

describe('useActiveStickers', () => {
  it('returns stars for a locked theme and the theme once unlocked', async () => {
    const clock = fakeClock();
    useSettings.setState({ stickerTheme: 'festival' });
    const { result, rerender } = await renderHook(() => useActiveStickers());
    expect(result.current).toBe(STICKER_THEMES[0]?.emoji);

    await act(async () => useUnlocksStore.getState().grant('theme:festival', clock.get()));
    expect(result.current).toEqual(['🥁', '🪔', '🎉', '🌸', '🎈']);

    clock.advance(24 * HOUR + 1);
    await rerender({});
    expect(result.current).toBe(STICKER_THEMES[0]?.emoji);
  });
});

describe('resetAdsState', () => {
  it('clears persisted counters, unlocks and the session count', async () => {
    const clock = fakeClock();
    await initAds();
    useAdsStore.setState({ lastInterstitialAt: clock.get() });
    useAdsRuntime.setState({ interstitialsThisSession: 2 });
    useUnlocksStore.getState().grant('theme:animals', clock.get());
    const { result } = await renderHook(() => useUnlocks());
    expect(result.current.isUnlocked('theme:animals')).toBe(true);

    await act(async () => resetAdsState());

    expect(useAdsStore.getState()).toMatchObject({ launchCount: 0, lastInterstitialAt: null });
    expect(useUnlocksStore.getState().unlocks).toEqual({});
    expect(useAdsRuntime.getState().interstitialsThisSession).toBe(0);
    expect(result.current.isUnlocked('theme:animals')).toBe(false);
    // Persisted too (MMKV), not just in memory.
    expect(mmkv.getString(STORAGE_KEYS.unlocks)).toContain('"unlocks":{}');
    expect(mmkv.getString(STORAGE_KEYS.ads)).toContain('"launchCount":0');
  });
});
