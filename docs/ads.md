# Ads (AdMob) — placements, caps and policy configuration

Owner: A8 (Monetization). Code: `src/monetization/` (the only place allowed to import
`react-native-google-mobile-ads`; ESLint enforces it). Policy source: `docs/HANDOVER.md` section 3 and
ADR 0001 point 6. Akhor Khel is a **Designed for Families** app for children aged 3–8: every rule below
is a release blocker.

## Placements

| Format                   | Where                                                                          | API                                                           | Rules                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Anchored adaptive banner | **Home, LetterGrid, WordList, ParentArea only** (final list, A0 decision)      | `<BannerSlot />` (`Screen`)                                   | Never on tracing or game screens. Always reserves `BANNER_HEIGHT`; thin divider above; nothing visible on error/offline.        |
| Interstitial             | When the child finishes a set (e.g. 5 letters) and is back on the grid         | `useAds().onSetComplete()`                                    | Caps below. Never at launch. Only if already loaded; otherwise resolves immediately. Resolves after the ad closes.              |
| Rewarded                 | Parent area only (behind the parent gate): "watch one ad to unlock X for 24 h" | `useUnlocks({ preloadRewarded: true })` (Rewards screen only) | Always opt-in by the parent; never offered to the child. Unlocks `bonusWords` or `theme:<id>` (non-free sticker themes).        |
| Global gate              | All formats                                                                    | —                                                             | No ad of any kind until the parent has seen the ads notice (`adsNoticeSeen`) **and** not in the first session of a new install. |

Banner placement rules:

- The banner (`<Screen banner>` → `<BannerSlot />`) appears on exactly four screens: **Home,
  LetterGrid, WordList and ParentArea**. Every other screen (tracing, games, word detail, numbers,
  profiles, teacher, onboarding, parent gate, …) must use `banner={false}`. Adding a screen to this
  list needs an A0 decision and an update to this file.
- Even on those screens the slot stays empty (space reserved, nothing requested) **until the parent
  has seen the ads notice** and **never in the first session of a new install** (launch 1).
- After a failed load the slot stays empty until it remounts; on Home (the stack root) that means
  until the next launch. This is deliberate: no retry loops offline.

Rewarded preload (ADR 0002): child screens may call `useUnlocks()` to read unlock state, which never
loads an ad. Only the parent-area Rewards screen passes `{ preloadRewarded: true }`; the ad is loaded
while that screen is mounted and never reloaded after it unmounts. `rewardedReady` is always false
without the option.

`resetAdsState()` (Parent area → Delete all data, ADR 0002) clears the launch counter, last
interstitial time, session count and all unlocks. The current process then counts as a first
session, so no ad shows until the next launch and the notice has been seen again.

`useActiveStickers()` returns the selected sticker theme (`settings.stickerTheme`) if it is free or
currently unlocked, otherwise the free `stars` theme.

## Caps (hard-coded in `src/monetization/logic/caps.ts`, unit-tested)

| Rule                                  | Value                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Interstitial minimum gap              | 1 per **4 minutes** (last show time is persisted, so restarting the app does not reset it)                   |
| Interstitials per app session         | **3** (session = process lifetime)                                                                           |
| First session of a new install        | **No ads at all**. A launch counter (`ads.v1` in MMKV) is incremented by `initAds()`; launch 1 is session 1. |
| Before the parent has seen the notice | **No ads at all**; the SDK is not even initialised                                                           |
| Banner after a failed load            | No new banner request for 60 s (no request loops offline)                                                    |
| Rewarded unlock                       | 24 h from the moment the reward is earned (`unlocks.v1` in MMKV)                                             |

Changing a cap is a policy change: update `caps.ts`, its tests and this file in the same PR, and get
an A6 review.

## Policy configuration (what the code does)

1. **Before `initialize()`** `initAds()` calls `setRequestConfiguration` with
   `tagForChildDirectedTreatment: true`, `tagForUnderAgeOfConsent: true`,
   `maxAdContentRating: MaxAdContentRating.G` and `ageRestrictedTreatment: CHILD` (SDK 17 deprecates the
   two booleans in favour of `ageRestrictedTreatment`; we set both so every code path ends at CHILD).
   If this call fails, the SDK is never initialised and no ads show (fail closed).
2. **Every request** (banner, interstitial, rewarded) uses `requestNonPersonalizedAdsOnly: true` and
   nothing else: no keywords, content URLs or identifiers.
3. **Deferred initialisation.** The SDK is only initialised once ads may actually show (notice seen
   and session ≥ 2). Until then the app makes no ad network traffic at all.
4. **Log line.** On every launch (debug **and** release) the app logs once:
   `[ads] AdMob configured: child-directed treatment ON, under-age-of-consent ON, max content rating G, non-personalized ads only.`
   Confirm it before each release: `adb logcat -s ReactNativeJS | grep "\[ads\]"`. A release build
   that falls back to Google test IDs also logs `[ads] Release build is using Google test ad unit IDs`.
5. **Advertising ID** is never transmitted: `AD_ID` and the Privacy Sandbox permissions are removed
   in `android/app/src/main/AndroidManifest.xml` (`tools:node="remove"`; checked by
   `tools/ci/check-release.sh`).
6. **Never blocks, never throws.** Offline or failed loads are silent; lessons never wait for an ad.

### Why there is no UMP / consent form

The Google User Messaging Platform (GDPR/TCF consent form) is designed for adults consenting to
personalised advertising. This app is directed at children, so:

- every request is tagged child-directed and under the age of consent, which makes Google serve only
  non-personalised, contextual ads and disables personalisation, remarketing and the Advertising ID
  regardless of any consent string;
- the UMP SDK itself does not collect consent from users tagged under the age of consent, and a
  child cannot give valid consent anyway (a consent form shown to a 3–8 year old is itself a Families
  policy risk);
- India's DPDP Rules 2025 forbid tracking and targeted advertising to children, which these tags
  already enforce. The parent-facing ads/privacy notice (behind the parent gate, `adsNoticeSeen`)
  covers transparency, and no ad shows before it has been seen.

If the app ever stops being child-directed, this decision must be revisited with legal review.

## Ad unit IDs and the AdMob App ID (GitHub secrets)

| Secret                  | Used by                                                               | Format                                   |
| ----------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `ADMOB_APP_ID`          | Gradle manifest placeholder `admobAppId` (`android/app/build.gradle`) | `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` |
| `ADMOB_BANNER_ID`       | `npm run gen:ad-units` → `src/monetization/adUnits.generated.ts`      | `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY` |
| `ADMOB_INTERSTITIAL_ID` | same                                                                  | same                                     |
| `ADMOB_REWARDED_ID`     | same                                                                  | same                                     |

- Add them in GitHub → repository Settings → Secrets and variables → Actions.
- **Debug builds** always use Google's test IDs (`TestIds`) and Google's sample App ID; never tap
  real ads on your own device.
- **Release builds:** CI runs `npm run gen:ad-units` **on `v*` tag builds only**
  (`.github/workflows/ci.yml`). The script validates the `ca-app-pub-…/…` format, rejects Google's test
  publisher and fails the build if any ID is missing or malformed. `ADMOB_APP_ID` is passed to Gradle
  only on tags; other release builds use the sample App ID.
- The committed `adUnits.generated.ts` holds `null`s, which fall back to test IDs (a unit test checks
  that no real ID is committed). After testing locally with real IDs, run
  `npm run gen:ad-units -- --reset` before committing.

## AdMob console settings (apply once, re-check before each release)

App settings:

- **Tag for child-directed treatment:** "Treat all ad requests as child-directed" (app level), in
  addition to the in-code tag.
- **Families / Designed for Families:** declare the app as Families in AdMob and Play Console.

Blocking controls (apply to the app):

- **Maximum ad content rating:** G.
- **Sensitive categories:** block all (dating, gambling, alcohol, politics, religion, get-rich-quick,
  cosmetic procedures, weight loss, references to sex, etc.).
- **General categories:** block anything not suitable for under-8s that slips through G (review the
  Ad review center and block by category or advertiser).
- Review the **Ad review center** weekly at launch, monthly after.

Ad units:

- **Banner:** automatic refresh **on, 30–60 s** (Google-optimised or 60 s).
- **Interstitial:** configure the unit as **display only (no video)** — under Ad unit → Ad type,
  untick Video. No frequency capping needed in the console (the app caps harder), but setting 1 per
  4 min there too is harmless.
- **Rewarded:** reward amount 1, type "unlock".
- **No mediation** (only Google AdMob, a Families self-certified SDK).

## Before every release

- [ ] `react-native-google-mobile-ads` and the underlying Google Mobile Ads SDK versions are on Play's
      [Families Self-Certified Ads SDK list](https://support.google.com/googleplay/android-developer/answer/12955212)
      (check the exact version, not just the name).
- [ ] No other ads/analytics SDK was added (`npm ls`, Gradle dependencies).
- [ ] `adb logcat` shows the `[ads] AdMob configured …` line on a release build.
- [ ] Release build is not using test IDs (no `[ads] Release build is using Google test ad unit IDs`).
- [ ] Banner only on Home, LetterGrid, WordList, ParentArea; interstitial never at launch; rewarded
      only on the parent Rewards screen (preloadRewarded true nowhere else).
- [ ] AdMob console settings above are still applied.
- [ ] `app-ads.txt` is live (below).
- [ ] Play Console Data safety form matches (ads, no Advertising ID, data not shared for tracking).

## app-ads.txt

AdMob requires an `app-ads.txt` file on the developer website listed in the Play Store listing:

1. Set the developer website in Play Console (store listing → contact details).
2. Host `https://<that-domain>/app-ads.txt` (root of the domain, plain text) containing the line AdMob
   shows under Apps → app-ads.txt, of the form
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.
3. In AdMob, wait for the status to turn "Verified" (can take up to 24 h after the store listing
   updates). Unverified apps lose most demand.

## Testing

- `npm test -- src/monetization` covers caps, unlock expiry, init order/config, banner layout and
  `onSetComplete` caps against a full SDK mock (`jest/mocks/react-native-google-mobile-ads.tsx`).
- On a device (debug build = test ads): accept the ads notice in the parent area, relaunch the app
  (session 2), finish a set → test interstitial; open the parent area Rewards screen → rewarded test ad unlocks a
  sticker theme for 24 h.
