import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { BANNER_HEIGHT } from '@/theme';

import { BannerSlot, initAds } from '..';
import { AD_MAX_HEIGHT, adaptiveWidthFor, BANNER_RETRY_AFTER_MS } from '../BannerSlot';
import { __mock, fakeClock, resetMonetization } from '../testing';

let warn: jest.SpyInstance;
beforeEach(() => {
  resetMonetization();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

function slotHeight() {
  return StyleSheet.flatten(screen.getByTestId('banner-slot').props.style).height;
}

describe('BannerSlot', () => {
  it('reserves BANNER_HEIGHT even when no ad may show', async () => {
    resetMonetization({ adsNoticeSeen: false });
    await initAds();
    await render(<BannerSlot />);
    expect(slotHeight()).toBe(BANNER_HEIGHT);
    expect(screen.queryByTestId('mock-banner-ad')).toBeNull();
  });

  it('shows nothing in the first session of a new install', async () => {
    resetMonetization({ launchCount: 0 });
    await initAds();
    await render(<BannerSlot />);
    expect(screen.queryByTestId('mock-banner-ad')).toBeNull();
  });

  it('renders an anchored adaptive, non-personalised banner that fits the slot', async () => {
    await initAds();
    await render(<BannerSlot />);
    expect(slotHeight()).toBe(BANNER_HEIGHT);
    const props = __mock.lastBanner();
    expect(props?.size).toBe('ANCHORED_ADAPTIVE_BANNER');
    expect(props?.requestOptions).toEqual({ requestNonPersonalizedAdsOnly: true });
    expect(props?.width).toBeLessThanOrEqual(adaptiveWidthFor(10000));

    // Divider appears with the ad; the slot height never changes.
    await act(async () => props?.onAdLoaded?.({ width: 360, height: 56 }));
    expect(StyleSheet.flatten(screen.getByTestId('banner-divider').props.style).opacity).not.toBe(
      0,
    );
    expect(slotHeight()).toBe(BANNER_HEIGHT);
  });

  it('caps the adaptive width so its height fits the reserved space', () => {
    expect(adaptiveWidthFor(320)).toBe(320);
    expect((adaptiveWidthFor(1280) * 50) / 320).toBeLessThanOrEqual(AD_MAX_HEIGHT);
  });

  it('falls back to the fixed 50 dp banner if the adaptive one is taller than the slot', async () => {
    await initAds();
    await render(<BannerSlot />);
    await act(async () => __mock.lastBanner()?.onAdLoaded?.({ width: 728, height: 90 }));
    expect(__mock.lastBanner()?.size).toBe('BANNER');
    expect(slotHeight()).toBe(BANNER_HEIGHT);
  });

  it('shows nothing after an error and does not retry in a loop', async () => {
    const clock = fakeClock();
    await initAds();
    const first = await render(<BannerSlot />);
    await act(async () => __mock.lastBanner()?.onAdFailedToLoad?.(new Error('offline')));
    expect(screen.queryByTestId('mock-banner-ad')).toBeNull();
    expect(slotHeight()).toBe(BANNER_HEIGHT);
    await first.unmount();

    // Another menu screen soon after: still nothing requested.
    const renders = __mock.bannerRenders.length;
    const second = await render(<BannerSlot />);
    expect(screen.queryByTestId('mock-banner-ad')).toBeNull();
    expect(__mock.bannerRenders.length).toBe(renders);
    await second.unmount();

    clock.advance(BANNER_RETRY_AFTER_MS);
    await render(<BannerSlot />);
    expect(screen.getByTestId('mock-banner-ad')).toBeTruthy();
  });
});
