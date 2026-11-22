/** Monetization contract (frozen, owner A0; implementation A8). */

/** Things a parent can unlock for 24 h by watching one rewarded ad (behind the parent gate). */
export type RewardId = 'bonusWords' | `theme:${string}`;

export type AdsApi = {
  /**
   * Call when the child finishes a set (e.g. 5 letters) and is back on the grid.
   * The module decides whether an interstitial may show (caps: 1 per 4 min, 3 per session,
   * never in the first session of a new install). Never blocks; resolves after any ad closes.
   */
  onSetComplete: () => Promise<void>;
};

export type UnlocksApi = {
  isUnlocked: (id: RewardId) => boolean;
  /** Epoch ms when the unlock expires, or 0. */
  unlockedUntil: (id: RewardId) => number;
  /** Shows a rewarded ad (parent area only). Resolves true if the reward was earned. */
  watchRewarded: (id: RewardId) => Promise<boolean>;
  /** Whether a rewarded ad is loaded and can be shown right now. */
  rewardedReady: boolean;
};
