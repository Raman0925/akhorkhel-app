import {
  adBlockReason,
  adsAllowed,
  canShowInterstitial,
  FIRST_SESSION_WITH_ADS,
  INTERSTITIAL_MAX_PER_SESSION,
  INTERSTITIAL_MIN_INTERVAL_MS,
  interstitialBlockReason,
  type InterstitialCapState,
} from '../logic/caps';

const MIN = 60 * 1000;

const ok: InterstitialCapState = {
  adsNoticeSeen: true,
  launchCount: 2,
  now: 10 * 60 * MIN,
  lastInterstitialAt: null,
  shownThisSession: 0,
};

describe('hard-coded caps', () => {
  it('match the handover policy', () => {
    expect(INTERSTITIAL_MIN_INTERVAL_MS).toBe(4 * MIN);
    expect(INTERSTITIAL_MAX_PER_SESSION).toBe(3);
    expect(FIRST_SESSION_WITH_ADS).toBe(2);
  });
});

describe('adBlockReason', () => {
  it('blocks every ad until the parent has seen the notice', () => {
    expect(adBlockReason({ adsNoticeSeen: false, launchCount: 10 })).toBe('notice-not-seen');
  });

  it('blocks the first session of a new install (and an uncounted launch)', () => {
    expect(adBlockReason({ adsNoticeSeen: true, launchCount: 0 })).toBe('first-session');
    expect(adBlockReason({ adsNoticeSeen: true, launchCount: 1 })).toBe('first-session');
    expect(adsAllowed({ adsNoticeSeen: true, launchCount: 2 })).toBe(true);
  });
});

describe('interstitialBlockReason', () => {
  it('allows the first interstitial of a later session', () => {
    expect(interstitialBlockReason(ok)).toBeNull();
    expect(canShowInterstitial(ok)).toBe(true);
  });

  it('never shows before the notice or in the first session', () => {
    expect(interstitialBlockReason({ ...ok, adsNoticeSeen: false })).toBe('notice-not-seen');
    expect(interstitialBlockReason({ ...ok, launchCount: 1 })).toBe('first-session');
  });

  it('allows at most one per 4 minutes', () => {
    const last = ok.now - 4 * MIN + 1;
    expect(interstitialBlockReason({ ...ok, lastInterstitialAt: last })).toBe('too-soon');
    expect(interstitialBlockReason({ ...ok, lastInterstitialAt: ok.now - 4 * MIN })).toBeNull();
  });

  it('treats a clock that went backwards as too soon', () => {
    expect(interstitialBlockReason({ ...ok, lastInterstitialAt: ok.now + MIN })).toBe('too-soon');
  });

  it('allows at most 3 per session, however long apart', () => {
    expect(interstitialBlockReason({ ...ok, shownThisSession: 2 })).toBeNull();
    expect(interstitialBlockReason({ ...ok, shownThisSession: 3 })).toBe('session-cap');
    expect(canShowInterstitial({ ...ok, shownThisSession: 99 })).toBe(false);
  });
});
