import { act } from '@testing-library/react-native';

import { useSettings } from '@/storage';

import { initAds } from '..';
import { CONFIG_LOG_MESSAGE } from '../config';
import { useAdsRuntime, useAdsStore } from '../stores';
import { __mock, resetMonetization } from '../testing';

const CHILD_CONFIG = {
  ageRestrictedTreatment: 'child',
  tagForChildDirectedTreatment: true,
  tagForUnderAgeOfConsent: true,
  maxAdContentRating: 'G',
};

let warn: jest.SpyInstance;

beforeEach(() => {
  resetMonetization();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => warn.mockRestore());

describe('initAds', () => {
  it('applies the child-directed, G-rated configuration before initialize()', async () => {
    await initAds();

    expect(__mock.mobileAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
    expect(__mock.mobileAds.setRequestConfiguration).toHaveBeenCalledWith(CHILD_CONFIG);
    expect(__mock.mobileAds.initialize).toHaveBeenCalledTimes(1);
    expect(__mock.callOrder).toEqual(['setRequestConfiguration', 'initialize']);
    expect(useAdsRuntime.getState().sdkReady).toBe(true);
  });

  it('logs the policy configuration once', async () => {
    await initAds();
    await initAds();
    const logs = warn.mock.calls.filter(c => c[0] === CONFIG_LOG_MESSAGE);
    expect(logs).toHaveLength(1);
    expect(CONFIG_LOG_MESSAGE).toMatch(/child-directed/);
    expect(CONFIG_LOG_MESSAGE).toMatch(/rating G/);
    expect(CONFIG_LOG_MESSAGE).toMatch(/non-personalized/);
  });

  it('is idempotent and counts one launch per process', async () => {
    await Promise.all([initAds(), initAds()]);
    await initAds();
    expect(__mock.mobileAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
    expect(__mock.mobileAds.initialize).toHaveBeenCalledTimes(1);
    expect(useAdsStore.getState().launchCount).toBe(2);
  });

  it('preloads an interstitial with non-personalised requests once ready', async () => {
    await initAds();
    const ad = __mock.lastInterstitial();
    expect(ad?.loadCalls).toBe(1);
    expect(ad?.requestOptions).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it('does not initialise the SDK in the first session of a new install', async () => {
    resetMonetization({ launchCount: 0 });
    await initAds();
    expect(useAdsStore.getState().launchCount).toBe(1);
    expect(__mock.mobileAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
    expect(__mock.mobileAds.initialize).not.toHaveBeenCalled();
    expect(__mock.lastInterstitial()).toBeUndefined();
  });

  it('waits for the ads notice, then initialises', async () => {
    resetMonetization({ adsNoticeSeen: false });
    await initAds();
    expect(__mock.mobileAds.initialize).not.toHaveBeenCalled();

    await act(async () => {
      useSettings.getState().markAdsNoticeSeen();
    });
    expect(__mock.mobileAds.initialize).toHaveBeenCalledTimes(1);
    expect(__mock.callOrder).toEqual(['setRequestConfiguration', 'initialize']);
  });

  it('never initialises if the child-directed configuration could not be applied', async () => {
    __mock.mobileAds.setRequestConfiguration.mockRejectedValueOnce(new Error('native'));
    await expect(initAds()).resolves.toBeUndefined();
    expect(__mock.mobileAds.initialize).not.toHaveBeenCalled();
    expect(useAdsRuntime.getState().sdkReady).toBe(false);
  });

  it('fails silently offline (initialize rejects)', async () => {
    __mock.mobileAds.initialize.mockRejectedValueOnce(new Error('offline'));
    await expect(initAds()).resolves.toBeUndefined();
    expect(useAdsRuntime.getState().sdkReady).toBe(false);
  });
});
