# Release runbook

How to take Akhor Khel from a green `main` to Google Play, and how to keep it there. Written for the
owner, who is an individual developer. Steps marked **(owner)** need a human with access to the
accounts; nothing here can be done by an agent.

Facts checked on 22 Nov 2026 (re-check before the first launch; Google changes these often):

- Target API: new apps and updates must target **API 36** from 31 Aug 2026
  (<https://developer.android.com/google/play/requirements/target-sdk>). The project targets 36.
- New **personal** developer accounts (created after 13 Nov 2023) must run a **closed test with at
  least 12 testers opted in continuously for 14 days** before applying for production access
  (<https://support.google.com/googleplay/android-developer/answer/14151465>).
- Google AdMob (`play-services-ads` **19.0.0 or later**) is on the Families Self-Certified Ads SDK
  list (<https://support.google.com/googleplay/android-developer/answer/12955712>).
- `app-ads.txt` must be at the **root of the developer website** listed in Play
  (<https://support.google.com/admob/answer/9363762>).

Related documents: `docs/store/*` (listing, Data safety, Families, graphics),
`docs/privacy-policy.md` and `site/` (privacy policy), `docs/CONTENT_GUIDE.md` (content work),
`docs/HANDOVER.md`.

---

## 0. Before anything: placeholders the owner must replace

| Placeholder                                                         | Where it is used                                                     | Action **(owner)**                                                                                                                                                                                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`akhorkhel.app@gmail.com`** — PLACEHOLDER EMAIL                   | Privacy policy, `site/index.html`, store listing, Play contact, IARC | Create this Gmail address (or choose another address you control) **before** publishing the privacy page. If you choose another address, replace it in every file: `grep -rn "akhorkhel.app@gmail.com" docs site`. It will be public. |
| Privacy policy URL `https://raman0925.github.io/akhorkhel-privacy/` | Listing, Play Console, in-app parent area                            | Publish it (section 1). If you move to a custom domain, update every reference, including the app's parent-area link.                                                                                                                 |
| Developer website                                                   | Play contact details; `app-ads.txt`                                  | Decide (section 1.2).                                                                                                                                                                                                                 |

## 1. Privacy policy site and developer website

### 1.1 Publish the privacy policy **(owner)**

The app repo is private, and GitHub Pages on a private repo needs a paid plan, so the policy goes in
a small **public** repo:

```bash
gh repo create Raman0925/akhorkhel-privacy --public --description "Akhor Khel privacy policy"
git clone https://github.com/Raman0925/akhorkhel-privacy.git
cp akhorkhel-app/site/index.html akhorkhel-privacy/index.html
cd akhorkhel-privacy && git add index.html && git commit -m "docs: publish privacy policy" && git push
gh api -X POST repos/Raman0925/akhorkhel-privacy/pages -f "source[branch]=main" -f "source[path]=/"
```

Wait a minute, then open <https://raman0925.github.io/akhorkhel-privacy/> on a phone and check that
both the English and Assamese sections display. Before publishing:

- [ ] the contact email exists and you can read mail sent to it;
- [ ] a native Assamese speaker has reviewed the Assamese section of `site/index.html`;
- [ ] a lawyer has reviewed the policy (section 9).

Whenever `docs/privacy-policy.md` changes, update `site/index.html`, copy it to the public repo and
change the effective date in both.

### 1.2 Developer website and `app-ads.txt` **(owner decision)**

AdMob's crawler reads `https://<developer-website-host>/app-ads.txt`, i.e. the **root** of the host
named as "Website" in the Play listing. A project page such as `…github.io/akhorkhel-privacy/` is not
a root, so a file there would not be found. Pick one:

1. **Recommended: `akhorkhel.in`** (HANDOVER 0 says to register it). Point it at a GitHub Pages
   site (custom domain) and put `app-ads.txt` and a simple home page at its root. Use
   `https://akhorkhel.in` as the Play "Website".
2. **No domain yet:** create the user site repo `Raman0925/raman0925.github.io` (public) with
   `app-ads.txt` at its root, and use `https://raman0925.github.io` as the Play "Website".

`app-ads.txt` content: copy the exact line AdMob shows for your account (AdMob → Apps → View all
apps → app-ads.txt → "How to set up app-ads.txt"). It looks like
`google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0` with **your** publisher ID. Do not
type it by hand.

After the app is live and linked in AdMob: open the file in a browser, wait at least 24 hours, then
AdMob → Apps → View all apps → app-ads.txt → expand the app → **Check for updates**.

## 2. Upload key (once) **(owner)**

Play App Signing holds the real app signing key; you only keep an **upload key**. Create it on your
own computer (JDK `keytool`), never in CI:

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore akhorkhel-upload.keystore \
  -alias akhorkhel-upload \
  -keyalg RSA -keysize 4096 \
  -validity 10000 \
  -dname "CN=Akhor Khel, O=Akhor Khel, C=IN"
```

- With PKCS12, the key password is the same as the store password: use the same value for both
  secrets below.
- Store the keystore file and password in a password manager **and** an offline backup. If the
  upload key is lost, Play support can reset it, but it takes days.
- Never commit the keystore. (`*.keystore` other than the debug one must stay out of git.)

Base64-encode it for the GitHub secret (one line, no wrapping):

```bash
# Linux
base64 -w0 akhorkhel-upload.keystore > upload.b64
# macOS
base64 -i akhorkhel-upload.keystore | tr -d '\n' > upload.b64
```

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("akhorkhel-upload.keystore")) | Out-File -Encoding ascii -NoNewline upload.b64
```

Delete `upload.b64` after setting the secret.

## 3. GitHub Actions secrets **(owner)**

The `CI` workflow (`.github/workflows/ci.yml`) uses these repository secrets on `v*` tag builds only.
Every other build uses Google's test ad IDs and is not release-signed.

| Secret                            | Value                                                              |
| --------------------------------- | ------------------------------------------------------------------ |
| `UPLOAD_KEYSTORE_BASE64`          | Contents of `upload.b64`                                           |
| `AKHORKHEL_UPLOAD_STORE_PASSWORD` | Keystore password                                                  |
| `AKHORKHEL_UPLOAD_KEY_ALIAS`      | `akhorkhel-upload` (or the alias you chose)                        |
| `AKHORKHEL_UPLOAD_KEY_PASSWORD`   | Key password (same as the store password for PKCS12)               |
| `ADMOB_APP_ID`                    | AdMob App ID, `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (section 6) |
| `ADMOB_BANNER_ID`                 | Banner ad unit ID, `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`        |
| `ADMOB_INTERSTITIAL_ID`           | Interstitial ad unit ID                                            |
| `ADMOB_REWARDED_ID`               | Rewarded ad unit ID                                                |

```bash
gh secret set UPLOAD_KEYSTORE_BASE64 < upload.b64
gh secret set AKHORKHEL_UPLOAD_STORE_PASSWORD   # prompts for the value
gh secret set AKHORKHEL_UPLOAD_KEY_ALIAS --body "akhorkhel-upload"
gh secret set AKHORKHEL_UPLOAD_KEY_PASSWORD
gh secret set ADMOB_APP_ID
gh secret set ADMOB_BANNER_ID
gh secret set ADMOB_INTERSTITIAL_ID
gh secret set ADMOB_REWARDED_ID
gh secret list
```

Never put real ad unit IDs in the repo, and never tap your own live ads (AdMob can suspend the
account). For testing on your own phone use a test build or add the phone as an AdMob test device.

## 4. Cut a release

1. Make sure `main` is green and every item in section 8 ("ready to ship") is done.
2. Bump the version on a branch and merge it via PR:
   - `android/app/build.gradle` → `versionCode` **+1** (integer; Play rejects a code it has seen
     before, including on testing tracks).
   - `package.json` → `"version": "X.Y.Z"` (Android `versionName` is read from here).
3. Tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull
   git tag -a vX.Y.Z -m "Akhor Khel vX.Y.Z"
   git push origin vX.Y.Z
   ```

4. CI on the tag runs: lint → typecheck → format → tests → `validate-packs` → **release gate**
   (`validate-packs:release`: every shipped pack verified, all audio/images present, no `auto`
   strokes) → no TODO/placeholder check → signed `bundleRelease` with the real AdMob IDs → policy
   checks (`tools/ci/check-release.sh`: permissions, targetSdk 36, 16 KB alignment, size) → Maestro
   E2E. If the gate fails, fix on `main`, bump `versionCode` again only if an AAB was already
   uploaded, and re-tag a new version (do not move an existing tag).
5. Download the signed AAB:

   ```bash
   gh run list --workflow CI --branch vX.Y.Z
   gh run download <run-id> --name app-release-aab
   ```

6. Upload it to Play (section 5). Write release notes in English and Assamese (≤ 500 characters
   each).

## 5. Google Play Console

### 5.1 First-time setup **(owner)**

1. Create a **personal** developer account (one-time fee, identity verification; use your legal
   name for verification — the public developer name can be "Akhor Khel"). Verify the contact
   email and phone.
2. **Create app**: name `Akhor Khel: Assamese Alphabet`, default language English (India), App,
   **Free**. Accept the declarations. Free cannot later be changed to paid.
3. **Play App Signing**: accept Google-generated app signing key (default for new apps). The first
   AAB you upload registers your upload key.
4. **Store listing**: paste from `docs/store/listing-en.md`; add the Assamese translation from
   `docs/store/listing-as.md` only after native review; upload graphics from
   `docs/store/graphics-spec.md`; category Education; contact email; website (section 1.2);
   privacy policy URL.
5. **App content** (Policy → App content), answers in `docs/store/families-and-content-rating.md`
   and `docs/store/data-safety.md`:
   - Privacy policy
   - Ads: **contains ads**
   - App access (explain the parent gate)
   - Content rating (IARC questionnaire)
   - Target audience and content: **5 & under, 6–8**; Families policy; ads SDK
   - Data safety
   - Advertising ID: **No**
   - Government / financial / health / news declarations: No
6. **Countries**: owner decision. Recommended first launch: **India only** (simplest legally; EEA/UK
   would also need a review of consent requirements for ads). Add countries later after legal advice.

### 5.2 Testing tracks

1. **Internal testing**: upload the AAB, add yourself and a few testers by email, install from the
   opt-in link, smoke-test on a real low-end phone (cold start, tracing at all 3 levels, airplane
   mode, a set completion → interstitial, parent gate → rewarded).
2. **Pre-launch report**: runs automatically on testing tracks. Fix crashes, accessibility warnings
   (touch targets, contrast) and any policy flags before going further. The parent gate will stop
   the robot from entering adult areas; that is expected.
3. **Closed testing** (required for new personal accounts): create a closed track, upload the same
   or a newer AAB, add **at least 12 testers** (Google Group or email list — e.g. teachers and
   parents who agreed to help) and keep them **opted in for 14 consecutive days**. Testers who
   leave and re-join lose their earlier days. Collect feedback via the track's feedback channel.
4. **Apply for production access** (Dashboard) after the 14 days, answering Google's questions
   about the test honestly (who tested, what you changed).

### 5.3 Production

1. Promote the tested release to **Production** with a **staged rollout** (e.g. 10% → 50% → 100%
   over a few days), watching Android vitals (crash rate, ANR rate) and reviews.
2. First review of a Families app can take longer than usual. If rejected, read the email, fix the
   exact issue, and reply through the Policy status page; do not resubmit blindly.
3. After it is live: link the app in AdMob (section 6), set the developer website so
   `app-ads.txt` can be verified, and check the store listing on a phone in both languages.

## 6. AdMob setup **(owner)**

1. Create an AdMob account with the same Google account (payments profile: individual, India;
   add tax and bank details under Payments so earnings can be paid).
2. **Add app** → Android → "not yet published" at first; after launch, link it to the Play listing.
   Copy the **App ID** to the `ADMOB_APP_ID` secret.
3. **Ad units** (names are for you only):
   - `banner-menu` — **Banner**. Use auto-refresh 30–60 s (Google-optimised is fine).
   - `interstitial-set-complete` — **Interstitial**. Ad type: **Display only, Video off** unless you
     have verified that every video interstitial can be closed within 5 seconds (Families policy;
     see risk R1 in `docs/store/families-and-content-rating.md`). Frequency capping is enforced in
     code (1 per 4 min, 3 per session); you may add the same cap in AdMob as a safety net.
   - `rewarded-parent-unlock` — **Rewarded**. Reward: 1 "unlock" (the app ignores the amount).
     Owner decision on keeping rewarded at all: see risk R1.
     Copy each unit ID into the matching secret.
4. **Child-directed and content rating**:
   - The app sets child-directed treatment, non-personalised ads and max rating **G** in code
     before initialising the SDK (`src/monetization/`). SDK settings override the console.
   - Also set them in the console as a backstop: Blocking controls → Content → **Maximum ad
     content rating: G**; and turn on child-directed treatment wherever AdMob offers it for the app
     or account (the location in the console changes; search AdMob Help for "child-directed").
5. **Blocking controls** → Sensitive categories: block everything not suitable for 3–8-year-olds
   (e.g. dating, gambling, alcohol, get-rich-quick, politics, religion, weight loss, references to
   sex, sensational content, drugs and supplements, cosmetic procedures, horror, violence).
   Block competitor apps by package if you wish. Review the Ad review center monthly.
6. **Privacy & messaging**: no consent message is needed for an India-only launch with
   child-directed, non-personalised ads. If you add EEA/UK/Switzerland, get advice first.
7. Verify on a test device with test ads that the logs show child-directed + G (HANDOVER 7.4).

## 7. Yearly upkeep (the only planned work)

Google raises the target API every year (usually announced in spring, deadline **31 August**).
Every year, ideally in June–July:

- [ ] Read the target API page; bump `compileSdkVersion` / `targetSdkVersion` in
      `android/build.gradle` and the check in `tools/ci/check-release.sh`; read the behaviour
      changes for the new Android version and test.
- [ ] Update React Native and pinned dependencies to the latest **stable** versions
      (`npm view <pkg> version`), especially `react-native-google-mobile-ads`.
- [ ] Check that the resulting `play-services-ads` version is still on the **Families
      Self-Certified Ads SDK list** (link above). Do this before **every** release, not only yearly.
- [ ] Re-read Google's AdMob data disclosure page and update `docs/store/data-safety.md`, the Play
      Data safety form and the privacy policy if it changed.
- [ ] Re-read the Families policy for new rules (ads formats, identifiers, AR, etc.).
- [ ] Check 16 KB page-size compatibility and download size in CI output.
- [ ] Renew the domain, check `app-ads.txt` still verifies in AdMob, check the privacy URL loads.
- [ ] Answer any Play Console policy declarations Google adds (they show on the Dashboard).
- [ ] Bump `versionCode`, tag, release through internal testing → production.

Also: respond to Play policy emails within their deadline; reply to reviews in English/Assamese.

## 8. Ready to ship — checklist

### Human content work (must be finished first)

The release gate refuses to build until this is done. Details and procedures are in
**`docs/CONTENT_GUIDE.md`**.

- [ ] Native review of every shipped pack (`asm-beng`, `brx-deva`, `mrg-latn`): alphabet order,
      spellings, words, translations; reviewer names recorded in the pack (`reviewedBy`).
- [ ] Audio recorded by native speakers (letters, words, voice prompts), processed to spec, with
      signed consent kept outside the repo.
- [ ] Original illustrations for every picture word, mascot and store graphics; licences/written
      permissions on file.
- [ ] Stroke review: every glyph's strokes checked or re-recorded by a native writer (no
      `strokeSource: "auto"` left).
- [ ] Any pack that cannot be verified in time is removed completely, and removed from the store
      listing, screenshots and video.
- [ ] Native review of `docs/store/listing-as.md`, the Assamese captions in
      `docs/store/graphics-spec.md` and the Assamese section of `site/index.html`.

### App checks (A6 audit on the signed build)

- [ ] Parent area has **delete child profile** and **delete all progress on this device**
      (promised in the privacy policy and Data safety).
- [ ] Parent gate guards settings, teacher mode, share/export, rewarded ads and the privacy link.
- [ ] Privacy policy link in the parent area opens the published URL.
- [ ] Ads: child-directed + G + non-personalised in logs; no interstitial at launch or in the
      first session; caps; no ads on tracing/game screens; rewarded only behind the gate; unlock
      expires after 24 h; lessons work in airplane mode.
- [ ] Merged manifest: only `INTERNET` and `ACCESS_NETWORK_STATE`; no `AD_ID`.
- [ ] Pre-launch report clean; Android vitals fine on internal/closed tracks.

### Store and accounts

- [ ] Contact email created; privacy site live; developer website + `app-ads.txt` live.
- [ ] Graphics, listing (en + reviewed as), Data safety, Families, ads, content rating done.
- [ ] Closed test 12 testers × 14 days completed; production access granted.

## 9. Legal review before launch **(owner)**

The developer is not a lawyer and neither are the agents who wrote these documents. Before the
first production release, have a lawyer familiar with Indian data-protection law review:

- the privacy policy (`docs/privacy-policy.md` / `site/index.html`);
- the ads setup against the **DPDP Act 2023 and DPDP Rules 2025** (notified 14 Nov 2025; most
  obligations, including those on children's data, apply about 18 months later, around May 2027 —
  confirm the exact date), in particular Section 9 (verifiable parental consent; no tracking,
  behavioural monitoring or targeted advertising directed at children) and whether AdMob's
  processing of IP address and identifiers for child-directed, non-personalised ads needs parental
  consent or other steps;
- whether a first-launch parent notice (behind the gate, HANDOVER 3.1) is enough or must change;
- COPPA and other laws if the app is offered outside India.

Record the outcome (who reviewed, date, changes) in this file's history via a PR.
