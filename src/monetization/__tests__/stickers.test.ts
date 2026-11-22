import { act, renderHook } from '@testing-library/react-native';

import { mmkv, STORAGE_KEYS, useSettings } from '@/storage';

import { initAds, resetAdsState, STICKER_THEMES, useActiveStickers } from '..';
import { stickerTheme } from '../stickers';
import { useAdsRuntime, useAdsStore } from '../stores';
import { fakeClock, resetMonetization } from '../testing';

let warn: jest.SpyInstance;
beforeEach(() => {
  resetMonetization();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

describe('sticker themes', () => {
  it('has four themes and falls back to stars for an unknown id', () => {
    expect(STICKER_THEMES.map(t => t.id)).toEqual(['stars', 'animals', 'fruits', 'festival']);
    expect(stickerTheme('fruits').id).toBe('fruits');
    expect(stickerTheme('nope')).toBe(STICKER_THEMES[0]);
  });
});

describe('useActiveStickers', () => {
  it('returns the selected theme (every theme is free)', async () => {
    useSettings.setState({ stickerTheme: 'festival' });
    const { result } = await renderHook(() => useActiveStickers());
    expect(result.current).toEqual(['🥁', '🪔', '🎉', '🌸', '🎈']);

    await act(async () => useSettings.getState().setStickerTheme('animals'));
    expect(result.current).toEqual(['🦏', '🐘', '🦌', '🐒', '🐟']);
  });
});

describe('resetAdsState', () => {
  it('clears the persisted counters and the session count', async () => {
    const clock = fakeClock();
    await initAds();
    useAdsStore.setState({ lastInterstitialAt: clock.get() });
    useAdsRuntime.setState({ interstitialsThisSession: 2 });

    await act(async () => resetAdsState());

    expect(useAdsStore.getState()).toMatchObject({ launchCount: 0, lastInterstitialAt: null });
    expect(useAdsRuntime.getState().interstitialsThisSession).toBe(0);
    // Persisted too (MMKV), not just in memory.
    expect(mmkv.getString(STORAGE_KEYS.ads)).toContain('"launchCount":0');
  });
});
