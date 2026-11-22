import { renderHook } from '@testing-library/react-native';

import { initAds, useAds } from '..';
import { onSetComplete } from '../interstitial';
import { useAdsRuntime, useAdsStore } from '../stores';
import { __mock, AdEventType, fakeClock, resetMonetization } from '../testing';

const MIN = 60 * 1000;

let warn: jest.SpyInstance;

beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

async function ready(setup?: Parameters<typeof resetMonetization>[0]) {
  resetMonetization(setup);
  const clock = fakeClock();
  await initAds();
  __mock.lastInterstitial()?.simulateLoaded();
  return clock;
}

/** Calls onSetComplete and, if an ad opened, closes it. Returns whether an ad was shown. */
async function finishSet(): Promise<boolean> {
  const ad = __mock.lastInterstitial();
  const before = ad?.showCalls ?? 0;
  const done = onSetComplete();
  await Promise.resolve();
  const shown = (ad?.showCalls ?? 0) > before;
  if (shown) {
    ad?.emit(AdEventType.CLOSED);
  }
  await done;
  return shown;
}

describe('useAds().onSetComplete', () => {
  it('is a stable function from the hook', async () => {
    const { result, rerender } = await renderHook(() => useAds());
    const first = result.current.onSetComplete;
    await rerender({});
    expect(result.current.onSetComplete).toBe(first);
    // The cap tests below call this same function directly.
    expect(first).toBe(onSetComplete);
  });

  it('shows a loaded interstitial and resolves only after it closes', async () => {
    await ready();
    const ad = __mock.lastInterstitial();
    let resolved = false;
    const done = onSetComplete().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(ad?.showCalls).toBe(1);
    expect(resolved).toBe(false);
    ad?.emit(AdEventType.CLOSED);
    await done;
    expect(resolved).toBe(true);
    // The next one is preloaded right away.
    expect(ad?.loadCalls).toBe(2);
  });

  it('resolves immediately when no ad is loaded (never blocks)', async () => {
    resetMonetization();
    fakeClock();
    await initAds();
    const ad = __mock.lastInterstitial();
    await expect(onSetComplete()).resolves.toBeUndefined();
    expect(ad?.showCalls).toBe(0);
  });

  it('allows at most one per 4 minutes', async () => {
    const clock = await ready();
    expect(await finishSet()).toBe(true);
    __mock.lastInterstitial()?.simulateLoaded();

    clock.advance(3 * MIN);
    expect(await finishSet()).toBe(false);

    clock.advance(MIN);
    expect(await finishSet()).toBe(true);
  });

  it('allows at most 3 per session', async () => {
    const clock = await ready();
    for (let i = 0; i < 3; i++) {
      expect(await finishSet()).toBe(true);
      __mock.lastInterstitial()?.simulateLoaded();
      clock.advance(5 * MIN);
    }
    expect(await finishSet()).toBe(false);
    expect(useAdsRuntime.getState().interstitialsThisSession).toBe(3);
  });

  it('keeps the 4-minute gap across restarts (persisted)', async () => {
    const clock = await ready();
    useAdsStore.setState({ lastInterstitialAt: clock.get() - MIN });
    expect(await finishSet()).toBe(false);
  });

  it('never shows in the first session of a new install', async () => {
    await ready({ launchCount: 0 });
    expect(__mock.lastInterstitial()).toBeUndefined();
    await expect(onSetComplete()).resolves.toBeUndefined();
  });

  it('never shows before the parent has seen the ads notice', async () => {
    await ready({ adsNoticeSeen: false });
    expect(__mock.lastInterstitial()).toBeUndefined();
    await expect(onSetComplete()).resolves.toBeUndefined();
  });

  it('resolves if showing fails, and does not reload in a loop after a load error', async () => {
    await ready();
    const ad = __mock.lastInterstitial();
    ad?.emit(AdEventType.ERROR, new Error('no fill'));
    expect(ad?.loadCalls).toBe(1);
    // A later finished set triggers exactly one new attempt.
    await onSetComplete();
    expect(ad?.loadCalls).toBe(2);
  });
});
