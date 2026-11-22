/**
 * Manual mock of react-native-google-mobile-ads 17.x for Jest (mapped in jest.config.js).
 *
 * Behaves like the real JS layer where it matters: `load()` is ignored while loading or loaded,
 * `show()` rejects unless loaded, CLOSED/ERROR reset the loaded state, listeners return an
 * unsubscribe function. Nothing loads on its own: tests drive events with the `__mock` helpers.
 */
import React from 'react';
import { View } from 'react-native';

export enum MaxAdContentRating {
  G = 'G',
  PG = 'PG',
  T = 'T',
  MA = 'MA',
}

export enum AgeRestrictedTreatment {
  CHILD = 'child',
  TEEN = 'teen',
  UNSPECIFIED = 'unspecified',
}

export enum AdEventType {
  LOADED = 'loaded',
  ERROR = 'error',
  OPENED = 'opened',
  PAID = 'paid',
  CLICKED = 'clicked',
  CLOSED = 'closed',
  IMPRESSION = 'impression',
}

export enum RewardedAdEventType {
  LOADED = 'rewarded_loaded',
  EARNED_REWARD = 'rewarded_earned_reward',
}

export enum BannerAdSize {
  BANNER = 'BANNER',
  FULL_BANNER = 'FULL_BANNER',
  LARGE_BANNER = 'LARGE_BANNER',
  LEADERBOARD = 'LEADERBOARD',
  MEDIUM_RECTANGLE = 'MEDIUM_RECTANGLE',
  ANCHORED_ADAPTIVE_BANNER = 'ANCHORED_ADAPTIVE_BANNER',
  LARGE_ANCHORED_ADAPTIVE_BANNER = 'LARGE_ANCHORED_ADAPTIVE_BANNER',
  INLINE_ADAPTIVE_BANNER = 'INLINE_ADAPTIVE_BANNER',
  WIDE_SKYSCRAPER = 'WIDE_SKYSCRAPER',
}

export const TestIds = {
  APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
};

export type RequestConfiguration = {
  maxAdContentRating?: MaxAdContentRating;
  ageRestrictedTreatment?: AgeRestrictedTreatment;
  tagForChildDirectedTreatment?: boolean;
  tagForUnderAgeOfConsent?: boolean;
  testDeviceIdentifiers?: string[];
};

export type RequestOptions = {
  requestNonPersonalizedAdsOnly?: boolean;
  keywords?: string[];
  contentUrl?: string;
};

/** Ordered log of SDK calls so tests can assert "configuration before initialize". */
const callOrder: string[] = [];

const mobileAdsInstance = {
  setRequestConfiguration: jest.fn((_config: RequestConfiguration) => {
    callOrder.push('setRequestConfiguration');
    return Promise.resolve();
  }),
  initialize: jest.fn(() => {
    callOrder.push('initialize');
    return Promise.resolve([]);
  }),
  openAdInspector: jest.fn(() => Promise.resolve()),
  setAppMuted: jest.fn(),
  setAppVolume: jest.fn(),
};

const mobileAds = () => mobileAdsInstance;
export const MobileAds = mobileAds;
export default mobileAds;

type EventType = AdEventType | RewardedAdEventType;
type Listener = (payload?: unknown) => void;

class MockFullScreenAd {
  readonly adUnitId: string;
  readonly requestOptions: RequestOptions | undefined;
  loaded = false;
  loadCalls = 0;
  showCalls = 0;
  destroyed = false;
  private loadCalled = false;
  private listeners = new Map<EventType, Set<Listener>>();

  constructor(
    adUnitId: string,
    requestOptions: RequestOptions | undefined,
    private readonly loadedEvent: EventType,
  ) {
    this.adUnitId = adUnitId;
    this.requestOptions = requestOptions;
  }

  load() {
    if (this.destroyed || this.loaded || this.loadCalled) {
      return;
    }
    this.loadCalled = true;
    this.loadCalls += 1;
  }

  show(): Promise<void> {
    this.showCalls += 1;
    if (!this.loaded) {
      return Promise.reject(new Error('Ad has not loaded and could not be shown.'));
    }
    return Promise.resolve();
  }

  addAdEventListener(type: EventType, listener: Listener): () => void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
    return () => {
      set.delete(listener);
    };
  }

  addAdEventsListener(listener: (e: { type: EventType; payload?: unknown }) => void): () => void {
    const unsubs = [...Object.values(AdEventType), ...Object.values(RewardedAdEventType)].map(t =>
      this.addAdEventListener(t, payload => listener({ type: t, payload })),
    );
    return () => unsubs.forEach(u => u());
  }

  removeAllListeners() {
    this.listeners.clear();
  }

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
  }

  /** Test helper: emit an SDK event (updates loaded state like the real JS layer). */
  emit(type: EventType, payload?: unknown) {
    if (type === this.loadedEvent) {
      this.loaded = true;
      this.loadCalled = false;
    }
    if (type === AdEventType.CLOSED || type === AdEventType.ERROR) {
      this.loaded = false;
      this.loadCalled = false;
    }
    [...(this.listeners.get(type) ?? [])].forEach(l => l(payload));
  }

  /** Test helper: complete a pending load. */
  simulateLoaded() {
    this.emit(this.loadedEvent);
  }

  listenerCount(type: EventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

export class InterstitialAd extends MockFullScreenAd {
  static instances: InterstitialAd[] = [];
  static createForAdRequest = jest.fn((adUnitId: string, requestOptions?: RequestOptions) => {
    const ad = new InterstitialAd(adUnitId, requestOptions, AdEventType.LOADED);
    InterstitialAd.instances.push(ad);
    return ad;
  });
}

export class RewardedAd extends MockFullScreenAd {
  static instances: RewardedAd[] = [];
  static createForAdRequest = jest.fn((adUnitId: string, requestOptions?: RequestOptions) => {
    const ad = new RewardedAd(adUnitId, requestOptions, RewardedAdEventType.LOADED);
    RewardedAd.instances.push(ad);
    return ad;
  });

  /** Test helper: the user watched to the end. */
  simulateEarnedReward() {
    this.emit(RewardedAdEventType.EARNED_REWARD, { type: 'reward', amount: 1 });
  }
}

export type BannerAdProps = {
  unitId: string;
  size: BannerAdSize | string;
  width?: number;
  maxHeight?: number;
  requestOptions?: RequestOptions;
  onAdLoaded?: (dimensions: { width: number; height: number }) => void;
  onAdFailedToLoad?: (error: Error) => void;
  onAdOpened?: () => void;
  onAdClosed?: () => void;
  onSizeChange?: (dimensions: { width: number; height: number }) => void;
};

/** Props of every mounted BannerAd, newest last. */
const bannerRenders: BannerAdProps[] = [];

export function BannerAd(props: BannerAdProps) {
  bannerRenders.push(props);
  return <View testID="mock-banner-ad" />;
}

/** Test helpers (not part of the real SDK). */
export const __mock = {
  callOrder,
  mobileAds: mobileAdsInstance,
  lastBanner: (): BannerAdProps | undefined => bannerRenders[bannerRenders.length - 1],
  bannerRenders,
  lastInterstitial: (): InterstitialAd | undefined =>
    InterstitialAd.instances[InterstitialAd.instances.length - 1],
  lastRewarded: (): RewardedAd | undefined => RewardedAd.instances[RewardedAd.instances.length - 1],
  reset() {
    callOrder.length = 0;
    bannerRenders.length = 0;
    InterstitialAd.instances.length = 0;
    RewardedAd.instances.length = 0;
    mobileAdsInstance.setRequestConfiguration.mockClear();
    mobileAdsInstance.initialize.mockClear();
    InterstitialAd.createForAdRequest.mockClear();
    RewardedAd.createForAdRequest.mockClear();
  },
};
