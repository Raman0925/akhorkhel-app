# Akhor Khel — Build Handover (Multi-Agent)

> Research date: 22 Nov 2026. Before adding or upgrading a dependency, re-verify with `npm view <pkg> version` and use the latest **stable** release. Never alpha, beta, rc or nightly.
>
> Repository notes (A0): the project setup decisions made while building are in `docs/adr/`. Where this handover and an ADR disagree, the ADR wins.

---

## 0. Brief

Build **Akhor Khel** (আখৰ খেল, "letter play"), an Android app (React Native CLI) that teaches children aged 3–8 to **see, hear, trace and write Assamese letters** (অ আ, ক খ গ), and adds **Bodo and Mising**, the tribal mother tongues no other app covers. **Revenue comes from ads only** (AdMob in Families-compliant mode). No purchases or subscriptions.

**Build-once rule:** one complete release, no V2/V3, roadmap or "coming soon". The app **never has a backend**: content ships inside the app, progress stays on the device, ads need internet but every lesson works offline. The only future work is the yearly upkeep Google requires (target API, SDK updates). The app has its own repo, brand and Play developer listing.

- **App name:** Akhor Khel. "Ko Kho" and "Aakhor" are taken by existing Assamese apps.
- **Play title (≤30):** `Akhor Khel: Assamese Alphabet` (29 chars).
- **applicationId:** `in.akhorkhel.app` (never changes after first upload). Register `akhorkhel.in` to match.
- **Repo:** `akhorkhel-app` (private GitHub), default branch `main`.

## 1. Research summary

### 1.1 Play autocomplete (22 Nov 2026)

| Typed          | Suggestions                                                                |
| -------------- | -------------------------------------------------------------------------- |
| "assamese al…" | assamese alphabet learning app, assamese alphabet, write assamese alphabet |
| "assamese wr…" | assamese writing app, assamese writing, assamese letter writing app        |
| "assamese l…"  | assamese language, assamese learning app, assamese language learning app   |
| "ko kho"       | ko kho, ko kho go gho, ko kho apps, ko kho game                            |
| "bodo "        | bodo translation app, bodo dictionary, bodo game                           |
| "mising "      | autocorrects to "missing"                                                  |

Search volume (and ad revenue) comes from **Assamese**; Bodo and Mising are the **differentiator**. Name, title and first screen lead with Assamese.

### 1.2 Competition

| App                             | Downloads | Rating | Weakness                                     |
| ------------------------------- | --------- | ------ | -------------------------------------------- |
| Ko Kho – Assamese Learning App  | 5K+       | 4.6    | Tap-to-hear only; no tracing                 |
| Bhutu Kai Kids – Learn Assamese | 1K+       | 4.8    | No stroke-guided tracing                     |
| Write Assamese Alphabets        | small     | 4.3    | Generic template; no stroke order or scoring |
| Axomia Karan                    | —         | 3.9    | Adults/grammar                               |

No one does stroke-order tracing with scoring, words and numbers in one polished app. Tribal languages have zero kids' apps.

### 1.3 Tribal languages

| Language                          | Script                                         | Kids' apps |
| --------------------------------- | ---------------------------------------------- | ---------- |
| Bodo (~1.48M)                     | Devanagari (+ ʼ U+02BC)                        | 0          |
| Mising (~630K)                    | Latin (Mising Agom Kébang orthography, uses é) | 0          |
| Dimasa, Rabha, Tiwa, Deori, Karbi | Latin / Assamese                               | 0          |

### 1.4 Best practices

- **Tracing:** start dot, numbered strokes, direction arrows; trace each letter 3 times; three levels (guided → faded guide → from memory); real-time feedback; left-hand mode; settings behind a parental gate.
- **Kids' UX:** voice-first navigation; touch targets ≥ 64dp; no fail screens; 5–10 minute sessions.
- **Play:** target API 36; 16 KB page size; small download.
- **ASO:** title ≤ 30, short description ≤ 80, full description ≤ 4,000; ratings, retention, crash and ANR rates matter.

## 2. Product scope

### 2.1 Language packs (all free)

1. **Assamese** (`asm-beng`): 11 vowels, 39–41 consonants incl. ৰ and ৱ, vowel signs (কাৰ), numbers ১–২০, ~150 picture words.
2. **Bodo** (`brx-deva`).
3. **Mising** (`mrg-latn`).

Optional: Dimasa, Rabha, Tiwa, Deori or Karbi **only** if verified content (text, strokes, native audio) is ready before launch. Otherwise leave the language out completely.

Interface: voice prompts; written UI in Assamese (default) + English.

### 2.2 Modules

1. **Akhor (Letters):** grid → letter screen (big letter, audio, picture word) → trace (3 levels) → stars.
2. **Swarachihna (vowel signs):** ক + া = কা; tracing plus listening.
3. **Sound games:** "Tap the letter you hear"; "Which picture starts with this sound?".
4. **Words:** picture + audio + word; bridge card (Bodo/Mising word + Assamese + English).
5. **Numbers ১–২০:** trace numerals; count objects.
6. **Profiles:** up to 40 local child profiles (nickname + avatar only).
7. **Teacher mode** (parent gate): class progress grid, quick child switching, PDF/CSV export via the share sheet.
8. **Parent area** (parent gate): settings, sound, ads notice, rewarded-ad unlocks, privacy policy.

### 2.3 Never built

Backend, login, cloud sync, remote config, purchases, subscriptions, licence codes, third-party analytics, chat, iOS release, speech recognition, ad networks other than AdMob.

## 3. Monetization (ads only)

### 3.1 Policy rules (non-negotiable)

- Only a Families Self-Certified ads SDK: **Google AdMob** via `react-native-google-mobile-ads`. Check the SDK version is on Play's self-certified list before every release. No mediation.
- Before `MobileAds().initialize()`: `tagForChildDirectedTreatment: true`, `maxAdContentRating: G`, non-personalized ads only.
- Don't transmit the Advertising ID; remove `com.google.android.gms.permission.AD_ID` (`tools:node="remove"`).
- No interstitials at launch; no unexpected ads; no ads where the child normally taps; clear close button; ads distinguishable from content.
- **India DPDP Rules 2025** (full compliance by May 2027): no tracking or targeted ads to children. Legal review before launch; first-launch notice for parents (behind the gate).

### 3.2 Placements

| Format          | Where                                                                                   | Rule                                                                                            |
| --------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Adaptive banner | Bottom of menu screens only (home, letter grid, word list, parent area)                 | Never on tracing or game screens                                                                |
| Interstitial    | After the child finishes a set (e.g. 5 letters) and returns to the grid                 | Never at launch; max 1 per 4 minutes and 3 per session; skip the first session of a new install |
| Rewarded        | Behind the parent gate: "Watch one ad to unlock a sticker theme / bonus words for 24 h" | Always opt-in; never offered to the child                                                       |

All ad logic lives in `src/monetization/` with hard-coded caps. Ads fail silently offline; lessons never wait for an ad.

### 3.3 Tuning without code

AdMob console: banner auto-refresh (30–60 s), A/B experiments, category blocking, monthly eCPM review.

### 3.4 Revenue model

India child-directed non-personalized: banner eCPM ~$0.10–0.40, interstitial ~$0.80–2.00. Earnings scale with daily users, so ranking and retention matter most.

## 4. Tech stack

| Concern       | Choice                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Framework     | React Native CLI 0.88.x, New Architecture, Hermes. No Expo.              |
| Language      | TypeScript strict, `noUncheckedIndexedAccess`                            |
| Drawing       | @shopify/react-native-skia 2.x                                           |
| Gestures      | react-native-gesture-handler 3.x                                         |
| Animation     | react-native-reanimated 4.x + react-native-worklets                      |
| Navigation    | @react-navigation/native + native-stack v7                               |
| Storage       | react-native-mmkv 4.x + react-native-nitro-modules                       |
| State         | zustand                                                                  |
| Audio         | react-native-audio-api (pre-recorded audio only)                         |
| Ads           | react-native-google-mobile-ads                                           |
| Fonts         | Noto Sans Bengali, Noto Sans Devanagari, Noto Sans (OFL)                 |
| Share/PDF     | react-native-share + react-native-html-to-pdf                            |
| Review prompt | react-native-in-app-review (Play In-App Review API, section 9)           |
| Testing       | Jest + @testing-library/react-native; Maestro E2E                        |
| CI            | GitHub Actions: lint → typecheck → test → validate-packs → bundleRelease |

Android: compileSdk 36, targetSdk 36, minSdk 24, AAB with Play App Signing, permissions `INTERNET` + `ACCESS_NETWORK_STATE` only, AD_ID removed, R8 + resource shrinking, 16 KB alignment, download < 40 MB. No monorepo, no custom native modules, no remote config.

## 5. Architecture

```
src/
  app/          App.tsx, RootNavigator, ErrorBoundary
  navigation/   route contract (types)
  theme/ ui/    tokens and shared child-sized components
  features/     home letters swarachihna games words numbers tracing profiles teacher parentGate parentArea
  monetization/ the only place ads exist
  content/      schema.ts loader.ts packs/<packId>/
  audio/ storage/ progress/ i18n/
tools/          validate-packs.ts, glyph geometry, asset manifest, svg-to-strokes, CI scripts
e2e/            Maestro flows
docs/           this file, CONTENT_GUIDE.md, privacy policy, store listing, ADRs
```

Pack ID = ISO 639-3 + ISO 15924 script (e.g. `asm-beng`).

### 5.1 Content schema

See `src/content/schema.ts` (the contract). The CI validator fails on an invalid schema, non-NFC glyphs, an item with no strokes, or a `verified` pack without `reviewedBy`. **The release build fails if any shipped pack is unverified.**

### 5.2 Tracing engine

- Skia canvas: faint letter, dashed guide per stroke, start dot, stroke numbers, animated arrow.
- Input: RNGH pan → points in a Reanimated shared value on the UI thread → Skia path (no React re-render per point).
- Scorer (pure TS, ≥ 90% coverage): resample to N=32 → start-point → direction (mean cosine > 0.6) → shape (mean distance < tolerance) → stroke order. L1 wide tolerance + snapping, L2 faded guide, L3 from memory ($P point-cloud match). 0–3 stars, never a red "wrong"; replay the stroke animation instead.
- Left-hand mode. Dev-only Stroke Recorder and an svg-to-strokes tool.
- Budget: 60fps on a 2 GB Android 10 phone; ink latency < 32 ms.

### 5.3 Storage & privacy

Local only: stars, attempts, settings, ad counters, unlock timers. Profile = nickname + avatar. Data safety: declare exactly what the AdMob SDK collects; the app collects nothing else. Privacy policy is a static GitHub Pages page.

## 6. Content rules

1. **Agents never make up letters, spellings, words, translations or audio.** Content comes from humans.
2. Assamese: Asam Sahitya Sabha alphabet order; a native teacher reviews and records (female and male child-friendly voices).
3. Bodo/Mising: alphabet from the language body (Bodo Sahitya Sabha, Mising Agom Kébang). CIIL/NCERT primers are reference only; examples and images are original or used with written permission.
4. Audio: 44.1 kHz WAV masters → mono AAC ~32 kbps, normalised, silence trimmed, named by item ID; signed consent kept outside the repo.
5. Images: original, flat, Assamese-culture illustrations. No known characters.
6. Unverified packs stay `draft-needs-native-review`; developers use clearly marked placeholders.

## 7. Multi-agent operating model

### 7.1 Roles

| Agent                      | Owns                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------- |
| A0 Lead                    | plan, docs, frozen contracts, merges                                                |
| A1 Foundation              | setup, app/, theme/, ui/, storage/, i18n/, CI, Android release config               |
| A2 Tracing                 | features/tracing/                                                                   |
| A3 Content & Audio         | content/, audio/, tools (validate-packs, geometry, assets), fonts, CONTENT_GUIDE.md |
| A4 Learning UI             | home, letters, swarachihna, games, words, numbers                                   |
| A5 Profiles/Teacher/Parent | profiles, teacher, parentGate, parentArea                                           |
| A8 Monetization            | src/monetization/                                                                   |
| A6 QA/Reviewer             | e2e/, reviews every PR, ads policy audit                                            |
| A7 Store & Compliance      | docs/store/, privacy policy, Data safety, Families declarations                     |

### 7.2 Order of work

Day 0 A0 + A1 (repo, CI, shell, contracts) → A2, A3, A7, A8 in parallel (A8 uses AdMob test IDs) → A4 and A5 → A6 reviews continuously.

### 7.3 Git & review rules

PRs against `main`, green CI and an A6 review before merge, squash-merge, Conventional Commits, PRs < ~400 lines with a test plan. Only stable dependencies, pinned exactly.

**Reviewer checklist:** strict types; tests; no new SDK outside section 4; no analytics; no AD_ID; no network calls except AdMob; no server code, stubs or TODOs; ads never on tracing/game screens, never at launch, caps respected, rewarded only behind the gate; no invented language content; touch targets ≥ 64dp; lessons work offline; no per-point re-renders while drawing; strings in i18n; release build passes.

### 7.4 Definition of done

- [ ] Signed AAB, targetSdk 36, 16 KB compatible, no AD_ID, download < 40 MB.
- [ ] `asm-beng`, `brx-deva`, `mrg-latn` verified with reviewer names.
- [ ] Tracing works for every glyph at all 3 levels; scorer coverage ≥ 90%.
- [ ] Cold start < 2.5 s; 60fps tracing on a low-end device.
- [ ] Ads: child-directed + G in logs; caps tested; none on tracing/game screens; rewarded unlock expires after 24 h; lessons work in airplane mode.
- [ ] Maestro: first launch → Assamese → trace 3 letters → stars → set complete → interstitial (test ID) → grid; parent gate → rewarded (test ID) → theme unlocked.
- [ ] Every module finished; no placeholders, "coming soon" or TODOs in the release build.
- [ ] Listing, Data safety, privacy policy, Families + ads declarations; legal review of ads/DPDP.

## 8. Design

Bright, calm colours; one main action per screen; buttons ≥ 64dp; voice prompt on every screen; short celebrations; portrait on phones. Original mascot (a baby rhino in a gamosa). Banner area reserved in layouts from day one.

## 9. ASO & ranking

- **Title:** `Akhor Khel: Assamese Alphabet`
- **Short description (74/80):** `Learn & write Assamese ক খ, অ আ letters. Kids tracing game + Bodo & Mising`
- **Full description** uses naturally: assamese alphabet learning app, write assamese alphabet, assamese writing app, assamese letter writing app, assamese learning app, ko kho go gho, অসমীয়া বৰ্ণমালা, স্বৰবৰ্ণ, ব্যঞ্জনবৰ্ণ, Bodo alphabet, Mising alphabet.
- Assamese (as) listing translation alongside English (India). Category Education; ages 5 & under + 6–8.
- Graphics: mascot + "ক" icon; 8 captioned screenshots, first shows tracing with stroke arrows; 30 s video.
- Ask for a rating from the parent area after the 3rd completed session (In-App Review API).
- Off-store: teacher WhatsApp groups, QR posters for schools and Anganwadis, launch around Bohag Bihu.

## 10. Risks

| Risk                          | Mitigation                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Families/ads policy rejection | Exact config from 3.1; A6 ads audit; AdMob only; pre-launch report                             |
| DPDP (May 2027)               | Child-directed non-personalized ads, no tracking, parent notice, legal review                  |
| Low eCPM                      | Interstitials at natural breaks; attractive rewarded unlocks behind the gate; grow daily users |
| Competitor copies tracing     | Content depth (vowel signs, words, tribal languages) + reviews                                 |
| Content accuracy / licensing  | Native reviewers; original content; written permissions                                        |
| Dependency churn              | Pinned stable versions; few native libraries                                                   |
