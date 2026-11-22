# ADR 0003: Drop rewarded ads

Date: 2026-11-22 · Status: accepted · Supersedes point 1 of ADR 0002 (rewarded preload) and the
rewarded row of handover section 3.2 · Amends the frozen `@/monetization` contract (ADR 0001)

## Context

The app offered one opt-in rewarded ad in the parent area ("watch one ad to unlock a sticker theme or
bonus words for 24 h"). Google Play's Families ads policy requires that ads shown in apps directed at
children can be closed after 5 seconds, explicitly "including rewarded or opt-in ads". Rewarded
video is usually 15–30 s and cannot be skipped without losing the reward, so it is a review risk
(risk R1 in `docs/store/families-and-content-rating.md`) that being parent-only does not remove.

## Decision

1. **No rewarded ads.** The rewarded ad unit, its preload, `watchRewarded`, `rewardedReady`,
   `UnlocksOptions`, `RewardId`, the unlock store (`unlocks.v1`) and the 24-hour expiry logic are
   removed. `ADMOB_REWARDED_ID` is no longer a secret or a build input.
2. **`useUnlocks` is removed.** Nothing is locked: bonus words are gone as a concept (the content
   schema no longer has a `bonus` field) and every word is always available.
3. **Sticker themes are all free.** `STICKER_THEMES` stays; `useActiveStickers()` returns the theme
   selected in `settings.stickerTheme` (unknown ids fall back to `stars`). The parent picks a theme
   in the parent area; the `Rewards` route and screen are removed.
4. **Remaining ads are unchanged:** the adaptive banner on Home, LetterGrid, WordList and ParentArea,
   and the capped interstitial after a completed letter set. `resetAdsState()` stays and clears the
   launch counter and interstitial timing (ADR 0002 point 2).

## Consequences

- Lower revenue upside; in exchange, the remaining formats are banner and display-only interstitial,
  which fit the Families policy without special handling.
- `@/monetization` exports: `initAds`, `BannerSlot`, `useAds`, `resetAdsState`, `STICKER_THEMES`,
  `StickerTheme`, `useActiveStickers`, `AdsApi`.
- Re-introducing any rewarded or opt-in ad needs a new ADR and a fresh Families policy review.
