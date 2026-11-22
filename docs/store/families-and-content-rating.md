# Families program, ads declaration and content rating

Play Console → Policy → App content. Answers for the Akhor Khel release build. Sources checked on
22 Nov 2026:

- Families policy: <https://support.google.com/googleplay/android-developer/answer/9893335>
- Families Self-Certified Ads SDK program:
  <https://support.google.com/googleplay/android-developer/answer/9900633>
- Self-certified SDK list (Google AdMob, `com.google.android.gms:play-services-ads`, **19.0.0 or
  later**): <https://support.google.com/googleplay/android-developer/answer/12955712>
- AdMob child-directed settings: <https://developers.google.com/admob/android/targeting>
- Target API requirement: <https://developer.android.com/google/play/requirements/target-sdk>

## 1. App content declarations

| Declaration        | Answer                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy     | `https://raman0925.github.io/akhorkhel-privacy/`                                                                                                              |
| Ads                | **Yes, my app contains ads** (Play shows the "Contains ads" label)                                                                                            |
| App access         | **All functionality is available without special access.** In the notes, explain the parent gate (an adult question shown on screen; no password or account). |
| Content rating     | IARC questionnaire, section 4                                                                                                                                 |
| Target audience    | **Ages 5 and under** and **Ages 6–8** only, section 2                                                                                                         |
| Data safety        | See `data-safety.md`                                                                                                                                          |
| Advertising ID     | **No**, the app does not use the advertising ID (the `AD_ID` permission is removed in the manifest)                                                           |
| Government app     | No                                                                                                                                                            |
| Financial features | My app doesn't provide any financial features                                                                                                                 |
| Health apps        | Not a health app                                                                                                                                              |
| News app           | No                                                                                                                                                            |
| COVID-19 apps      | Not applicable (if still shown)                                                                                                                               |
| In-app purchases   | None (no Play Billing in the app)                                                                                                                             |

## 2. Target audience and content

| Question                            | Answer                                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target age groups                   | **Ages 5 & under** and **Ages 6–8**. Do not tick 9–12 or older: the app is designed for 3–8 and Play asks to select only the groups the app is designed for.    |
| Store listing appeal to children    | Yes, intentionally (mascot, bright graphics); consistent with the target audience                                                                               |
| Mixed audience / neutral age screen | Not applicable: children are the **sole** target audience. Every user is treated as a child, so no age screen is needed and none should be added.               |
| Families policy                     | Accept. All ads are served with child-directed treatment; see the checklist in section 5.                                                                       |
| Ads SDK                             | Google AdMob via `react-native-google-mobile-ads` (currently pulls `play-services-ads` 25.5.0, which is above the self-certified minimum 19.0.0). No mediation. |

Teachers and parents use the app too, but only behind the parent gate; that does not make it a
mixed-audience app.

## 3. Teacher Approved

- There is no application form. Google's policy says apps that comply with the Families policies
  "can opt in to be rated" and that inclusion is not guaranteed. Google describes teachers rating apps on things
  such as age-appropriateness, quality of the experience and learning value, and on whether ads
  and monetisation suit children.
- What helps Akhor Khel: real learning goal (tracing with stroke order), no fail screens, voice
  prompts for pre-readers, tribal-language content, calm ad placement (none during learning),
  rewarded ads only for adults behind the gate.
- What can hurt: ad frequency. If Teacher Approved matters more than revenue, consider removing
  the interstitial in a later yearly update (the caps live in `src/monetization/`).
- Never use "Teacher Approved" in the listing or graphics unless the badge is granted.

## 4. IARC content rating questionnaire

Play Console → App content → Content rating → Start questionnaire. Use the contact email
`akhorkhel.app@gmail.com` (placeholder). The questionnaire wording changes from time to time;
answer the meaning below, not the exact sentence.

**Category:** _Reference, News, or Educational_ (the app is educational; its games are short
learning activities). If Play only offers "Game" vs "App", choose the educational / reference
option, not Game.

| Topic                                           | Answer         | Notes                                                                                  |
| ----------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| Violence (any, including cartoon)               | No             |                                                                                        |
| Fear / horror / scary content                   | No             | Mascot is friendly; no scary sounds                                                    |
| Sexuality / nudity                              | No             |                                                                                        |
| Gambling (real or simulated)                    | No             | Stars are rewards for tracing, not a currency; no loot boxes                           |
| Language (profanity, crude humour)              | No             |                                                                                        |
| Controlled substances (drugs, alcohol, tobacco) | No             | Check picture words: no tamul-pan (betel nut), alcohol or tobacco images in word packs |
| Discriminatory content                          | No             |                                                                                        |
| Users can interact or communicate               | No             | No chat, no user-generated content shared with others                                  |
| Shares user's location with others              | No             |                                                                                        |
| Allows purchase of digital goods                | No             | Rewarded unlocks are free, by watching an ad                                           |
| Unrestricted internet / web browser             | No             | The only outbound link (privacy policy) opens behind the parent gate                   |
| Shares personal information                     | No             |                                                                                        |
| Contains ads                                    | Yes (if asked) |                                                                                        |

**Expected result:** IARC Generic 3+, PEGI 3, ESRB Everyone, USK 0, ClassInd L, ACB G (exact
labels are set by IARC). If the result is higher than "all ages" anywhere, re-check the answers;
the Families program expects all-ages content.

## 5. Families policy checklist — how Akhor Khel complies

Verify every row on the **signed release build** before each production rollout (A6 owns the ads
policy audit; Maestro covers the flows).

| Families requirement                                                                       | How Akhor Khel complies                                                                                                                                                                                              | Where                                                 |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Only Families Self-Certified ads SDKs                                                      | AdMob only, `play-services-ads` ≥ 19.0.0 (list checked 22 Nov 2026). No mediation, no other ad network.                                                                                                              | `package.json`, `src/monetization/`                   |
| Ads requests flagged child-directed; no interest-based ads or remarketing                  | Request configuration set **before** `MobileAds().initialize()`: child-directed treatment true, non-personalised ads only. Also set the child-directed setting in the AdMob console.                                 | `src/monetization/` `initAds()`; AdMob → App settings |
| Ads appropriate for children                                                               | `maxAdContentRating: G` in code; AdMob console max ad content rating G; sensitive category blocking (see `docs/RELEASE.md`).                                                                                         | `src/monetization/`; AdMob blocking controls          |
| Must not transmit the Android advertising ID or other device identifiers (IMEI, MAC, etc.) | `AD_ID` permission removed (`tools:node="remove"`); Privacy Sandbox ad-services permissions removed; child-directed treatment stops AAID transmission. The app reads no hardware IDs.                                | `AndroidManifest.xml`; `tools/ci/check-release.sh`    |
| Apps solely for children should not request `AD_ID` on API 33+                             | Removed; CI fails the build if any permission other than `INTERNET` / `ACCESS_NETWORK_STATE` appears.                                                                                                                | `tools/ci/check-release.sh`                           |
| No location permission or precise location                                                 | No location permission.                                                                                                                                                                                              | Manifest                                              |
| Disclose all data collected from children, including via SDKs                              | Data safety declares everything AdMob collects; privacy policy explains it.                                                                                                                                          | `data-safety.md`, `docs/privacy-policy.md`            |
| No interstitial at launch                                                                  | No full-screen ad at launch. Interstitial only after a finished set, on return to the grid. No ads at all (banner or full-screen) before a parent has seen the ads notice or during the first session after install. | `src/monetization/` caps                              |
| No ads that interfere with normal use and cannot be closed after 5 seconds                 | Interstitial: max 1 per 4 min, max 3 per session. **See risk R1 below** for video creatives. Rewarded: opt-in, adult-only, behind the gate.                                                                          | AdMob ad unit settings; `src/monetization/`           |
| Clear close button; no ad that triggers another ad on dismiss                              | Standard AdMob full-screen formats; app never chains ads; the next interstitial waits for the cap.                                                                                                                   | `src/monetization/`                                   |
| Ads clearly distinguishable from content; no deceptive placement                           | Banner sits in a reserved strip at the bottom of **menu screens only** (home, letter grid, word list, parent area), separated from buttons; never on tracing or game screens.                                        | `BannerSlot` usage; layouts                           |
| No ads where the child normally taps / no accidental clicks                                | No banner on tracing/game screens; banner strip has spacing from 64 dp child buttons.                                                                                                                                | `src/ui` `Screen`                                     |
| One ad placement per page                                                                  | At most one banner per screen; no banner while a full-screen ad is shown.                                                                                                                                            | `src/monetization/`                                   |
| No emotionally manipulative tactics to encourage ad viewing or purchases                   | Rewarded ads are never offered to the child; no "watch to continue" prompts; lessons never wait for an ad; no purchases.                                                                                             | Parent area → Rewards                                 |
| Links out of the app / settings for adults                                                 | Privacy policy link, rewarded ads, settings, teacher mode and share/export are behind the parent gate.                                                                                                               | `src/features/parentGate`, `parentArea`               |
| Content appropriate for children                                                           | All content human-made and reviewed by native speakers; original illustrations; no known characters.                                                                                                                 | `docs/CONTENT_GUIDE.md`                               |
| No social features / chat; no user-generated content shared                                | None.                                                                                                                                                                                                                | —                                                     |
| Target API meets Play requirement                                                          | targetSdk 36 (required for new apps and updates from 31 Aug 2026). CI fails otherwise.                                                                                                                               | `android/build.gradle`; `check-release.sh`            |
| Accurate Play Console declarations                                                         | This file + `data-safety.md`.                                                                                                                                                                                        | Play Console                                          |

## 6. Open risks for the owner

**R1 — 5-second rule for full-screen ads.** The Families policy prohibits "monetization and
advertising that interfere with normal app use or game play, including rewarded or opt-in ads"
that "are not closeable after 5 seconds". The app cannot control the close timing inside an AdMob
creative.

- Interstitial: in the AdMob console, restrict the interstitial ad unit to the **Display** (image /
  rich media) ad type and turn **Video** off, unless testing on real devices shows video
  interstitials can always be closed by 5 seconds. Re-test after every SDK update.
- Rewarded: rewarded video is usually 15–30 s and unskippable without losing the reward. It is
  opt-in, adult-only, behind the parent gate and does not interrupt learning, which we believe
  means it does not "interfere with normal app use", but the policy text explicitly names
  rewarded ads. **Owner decision:** keep rewarded (moderate review risk; revenue upside) or remove
  it before the first submission (zero risk). If kept, mention the gate in the App access notes and
  watch the first review closely.

**R2 — `tagForChildDirectedTreatment` deprecation.** Google's AdMob targeting page now marks the
child-directed method as deprecated in favour of an age-restricted-treatment setting. A8 should use
whichever API the pinned `react-native-google-mobile-ads` exposes that produces child-directed
treatment, and confirm it in the SDK request logs ("child-directed + G in logs", HANDOVER 7.4).

**R3 — app set ID.** Google's disclosure lists the app set ID as collected by the SDK and does not
say child-directed treatment stops it. We declare "Device or other IDs" (see `data-safety.md`).
This is not a Families violation (the policy names the advertising ID and hardware identifiers),
but keep an eye on Google's guidance.
