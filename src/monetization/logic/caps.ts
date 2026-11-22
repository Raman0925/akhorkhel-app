/**
 * Hard-coded ad frequency caps (handover 3.2). Pure functions only: no SDK, no storage, no clock.
 * Changing a number here is a policy decision; update docs/ads.md in the same PR.
 */

/** At most one interstitial every 4 minutes (measured across restarts). */
export const INTERSTITIAL_MIN_INTERVAL_MS = 4 * 60 * 1000;

/** At most three interstitials per app session (process lifetime). */
export const INTERSTITIAL_MAX_PER_SESSION = 3;

/** The first launch of a new install is session 1; ads may start from this session number. */
export const FIRST_SESSION_WITH_ADS = 2;

export type AdGateState = {
  /** Parent has seen the ads notice behind the parent gate. */
  adsNoticeSeen: boolean;
  /** Persisted launch counter; the first launch of a new install is 1 (0 = not counted yet). */
  launchCount: number;
};

export type InterstitialCapState = AdGateState & {
  /** Current time, epoch ms. */
  now: number;
  /** Epoch ms of the last interstitial shown, or null if none. */
  lastInterstitialAt: number | null;
  /** Interstitials shown in this process. */
  shownThisSession: number;
};

export type AdBlockReason = 'notice-not-seen' | 'first-session';
export type InterstitialBlockReason = AdBlockReason | 'session-cap' | 'too-soon';

/** Why no ad of any kind may show right now, or null when ads are allowed. */
export function adBlockReason(s: AdGateState): AdBlockReason | null {
  if (!s.adsNoticeSeen) {
    return 'notice-not-seen';
  }
  if (s.launchCount < FIRST_SESSION_WITH_ADS) {
    return 'first-session';
  }
  return null;
}

export function adsAllowed(s: AdGateState): boolean {
  return adBlockReason(s) === null;
}

/** Why an interstitial may not show right now, or null when it may. */
export function interstitialBlockReason(s: InterstitialCapState): InterstitialBlockReason | null {
  const gate = adBlockReason(s);
  if (gate) {
    return gate;
  }
  if (s.shownThisSession >= INTERSTITIAL_MAX_PER_SESSION) {
    return 'session-cap';
  }
  if (s.lastInterstitialAt !== null) {
    const elapsed = s.now - s.lastInterstitialAt;
    // A clock that moved backwards (elapsed < 0) is treated as "too soon".
    if (elapsed < 0 || elapsed < INTERSTITIAL_MIN_INTERVAL_MS) {
      return 'too-soon';
    }
  }
  return null;
}

export function canShowInterstitial(s: InterstitialCapState): boolean {
  return interstitialBlockReason(s) === null;
}
