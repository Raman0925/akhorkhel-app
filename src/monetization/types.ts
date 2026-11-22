/** Monetization contract (frozen, owner A0; implementation A8). */

export type AdsApi = {
  /**
   * Call when the child finishes a set (e.g. 5 letters) and is back on the grid.
   * The module decides whether an interstitial may show (caps: 1 per 4 min, 3 per session,
   * never in the first session of a new install). Never blocks; resolves after any ad closes.
   */
  onSetComplete: () => Promise<void>;
};
