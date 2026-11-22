# ADR 0002: Rewarded preload is opt-in; ads state reset

Date: 2026-11-22 · Status: accepted · Amends the frozen `@/monetization` contract (ADR 0001)

## Context

`useUnlocks()` loaded a rewarded ad whenever any screen mounted it. Child screens (Home, WordList,
Word) call it only to read `isUnlocked('bonusWords')`. Home is the stack root and never unmounts, so
a rewarded ad was requested from a child screen and reloaded after every close for the whole session
(A6 review of PR #2). Nothing was shown to the child, but it contradicts "rewarded: parent area only"
and wastes ad requests.

Separately, Parent area → "Delete all data" had no way to clear ad counters and unlocks, which live in
zustand memory as well as in MMKV.

## Decision

1. **`useUnlocks(options?: { preloadRewarded?: boolean })`, default `false`.**
   - Without the option the hook only reads unlock state: it never creates or loads a rewarded ad,
     `rewardedReady` is always `false`, and `watchRewarded` resolves `false` unless an ad is loaded.
   - Only the parent-area Rewards screen passes `{ preloadRewarded: true }`. The ad loads while that
     screen is mounted, is reloaded after a close only while the screen is still mounted, and is
     never reloaded after it unmounts (no reload loop).
   - New exported type `UnlocksOptions`.
2. **`resetAdsState()` exported from `@/monetization`.** It clears the persisted launch counter and
   last interstitial time (`ads.v1`), all unlocks (`unlocks.v1`) and the in-memory interstitial
   session count. Parent area → Delete all data calls it together with `clearAllData()`. With the
   launch counter at 0, the current process counts as a new install's first session, so no ad shows
   until the next launch and the parent has seen the ads notice again. The SDK stays initialised (it
   cannot be un-initialised), but the gate keeps every placement off.

## Consequences

- A5 (Rewards screen) must pass `{ preloadRewarded: true }`; A4's child screens need no change.
- A5 (Delete all data) calls `resetAdsState()`.
- Placement list and rules: `docs/ads.md`.
