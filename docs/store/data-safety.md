# Play Console — Data safety answers

Play Console → Policy → App content → Data safety. These answers describe the release build as
designed in `docs/HANDOVER.md` (sections 2.3, 3, 5.3) and the merged manifest
(`android/app/src/main/AndroidManifest.xml`: `INTERNET` and `ACCESS_NETWORK_STATE` only;
`AD_ID` and the Privacy Sandbox ad-services permissions removed).

Sources checked on 22 Nov 2026:

- Google Mobile Ads SDK data disclosure:
  <https://developers.google.com/admob/android/privacy/play-data-disclosure>
- Play Console Help, "Provide information for Google Play's Data safety section":
  <https://support.google.com/googleplay/android-developer/answer/10787469>
- AdMob child-directed settings: <https://developers.google.com/admob/android/targeting>

Re-check the AdMob disclosure page before every release and whenever the ads SDK is updated: Google
changes it, and the developer is responsible for what the SDK sends.

## 1. The principle

- **The app itself collects nothing.** There is no backend, no account, no analytics SDK, no crash
  reporter and no network call except those made by the Google Mobile Ads SDK. Child profiles
  (nickname + avatar), stars, attempts, settings and ad counters stay in on-device
  storage (MMKV). Per Play's definition, data that never leaves the device is not "collected".
- **Teacher export (PDF/CSV)** is created on the device and handed to the Android share sheet only
  when the adult taps Share behind the parent gate. The app does not send it anywhere; this is a
  user-initiated transfer to an app the adult chooses, which Play's guidance does not count as
  sharing. Nothing to declare for it.
- **Everything declared below comes from the Google Mobile Ads SDK** (AdMob). Google's disclosure
  page says the SDK collects this data "for advertising, analytics, and fraud prevention purposes"
  and that all of it is "encrypted in transit" (TLS). Google receives it as a third party, so it is
  declared as both **collected** and **shared**.

## 2. Overview questions

| Question                                                                  | Answer                                                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Does your app collect or share any of the required user data types?       | **Yes** (through the AdMob SDK)                                                                     |
| Is all of the user data collected by your app encrypted in transit?       | **Yes** (Google: all data collected by the Google Mobile Ads SDK is encrypted via TLS)              |
| Which of the following methods of account creation does your app support? | **My app does not allow users to create an account**                                                |
| Do you provide a way for users to request that their data is deleted?     | **No** — see section 5; owner decision                                                              |
| Committed to follow the Play Families Policy (security practices badge)   | **Opt in** — the app is designed to meet the Families policy (see `families-and-content-rating.md`) |
| Independent security review                                               | Not done (optional) — leave unticked                                                                |

## 3. Data types to declare

Tick **only** these four data types. Leave every other category unticked (Personal info, Financial
info, Health and fitness, Messages, Photos and videos, Audio, Files and docs, Calendar, Contacts,
Web browsing, Precise location, and the other App activity / App info types).

| Play category            | Data type            | Collected | Shared | Processed ephemerally? | Required or optional | Purposes (tick)                                                                 | Why                                                                                                                                                       |
| ------------------------ | -------------------- | --------- | ------ | ---------------------- | -------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location                 | Approximate location | Yes       | Yes    | No                     | Required             | Advertising or marketing; Analytics; Fraud prevention, security, and compliance | The SDK collects the device's IP address, "which may be used to estimate the general location of a device". The app never requests a location permission. |
| App activity             | App interactions     | Yes       | Yes    | No                     | Required             | Advertising or marketing; Analytics; Fraud prevention, security, and compliance | The SDK collects "app launch, taps, and video views" (ad impressions and clicks).                                                                         |
| App info and performance | Diagnostics          | Yes       | Yes    | No                     | Required             | Analytics; Fraud prevention, security, and compliance; Advertising or marketing | The SDK collects "app launch time, hang rate, and energy usage" about the app and the SDK.                                                                |
| Device or other IDs      | Device or other IDs  | Yes       | Yes    | No                     | Required             | Advertising or marketing; Analytics; Fraud prevention, security, and compliance | Google lists "Android advertising (ad) ID, app set ID, and, if applicable, other identifiers". See note below.                                            |

Notes on these answers:

- **Processed ephemerally: No.** Play's guidance says data used for advertising cannot be treated
  as ephemeral.
- **Required: Yes.** Users cannot switch AdMob off inside the app. (Lessons work offline, but when
  the device is online the SDK runs.)
- **Purposes.** Google's page gives the three purposes for the SDK as a whole without mapping them
  to each data type, so all three are ticked for every type. Do **not** tick "Personalization" —
  the app requests non-personalised, child-directed ads only. Do not tick "App functionality",
  "Developer communications" or "Account management".
- **Device or other IDs — the advertising ID.** The manifest removes
  `com.google.android.gms.permission.AD_ID`, so on Android 13+ the advertising ID is not available
  to the app, and Google states that child-directed treatment "prevents the transmission of the
  Android advertising identifier (AAID)". The advertising ID is therefore **not** sent. We still
  tick "Device or other IDs" because Google's disclosure lists the **app set ID** and "other
  identifiers" as collected, and Google does not say that child-directed treatment stops those.
  Declaring it is the accurate, conservative answer; under-declaring is a policy violation,
  over-declaring is not. Owners: if Google later documents that no identifier is sent for
  child-directed requests, this row may be removed.
- **Precise location: not declared.** No location permission; the SDK only derives approximate
  location from the IP address.
- **Crash logs: not declared.** The app has no crash reporter; Google's disclosure lists
  diagnostics, not crash logs, for the SDK. Play's own Android vitals is collected by Google Play
  itself, not by the app, and is not declared.

## 4. Things that are NOT collected (for reviewers and for the privacy policy)

Name, email, phone, address, photos, audio/microphone (the `RECORD_AUDIO` permission is removed;
the app never records audio; it only plays bundled sounds), contacts, files, precise location, the child's drawings,
nicknames, avatars, progress, teacher exports, in-app search, installed apps, purchase history. No
analytics, no crash reporting, no remote config, no other SDK that sends data.

## 5. Deletion — "Do you provide a way for users to request that their data is deleted?"

**Recommended answer: No.** Reasoning:

- The developer runs no server and receives no user data, so there is nothing the developer can
  delete on request. The data declared above is held by Google under Google's own policies.
- The app has no accounts, so Play's account-deletion requirement (and the "delete account" URL)
  does not apply.
- On-device data is not "collected" and so is outside this question, but parents can delete it at
  any time: Parent area → delete a child profile, or Delete all data (profiles, progress, settings) on this device (A5 must
  ship this control; see `docs/RELEASE.md` pre-launch checks), or Android Settings → Apps →
  Akhor Khel → Storage → Clear storage, or uninstall. The privacy policy explains this.

**Owner decision:** answering "Yes" is allowed only if a real mechanism exists. If the owner wants
"Yes", the honest mechanism is: email `akhorkhel.app@gmail.com` (placeholder) → the developer
replies with the on-device deletion steps and the link to Google's privacy controls
(<https://policies.google.com/privacy>). That does not delete anything Google holds, so "No" is the
more accurate answer.

## 6. What the Data safety section will show to users (expected)

- Data shared with third parties: Location (approximate), App activity, App info and performance,
  Device or other IDs.
- Data collected: the same four.
- Security practices: Data is encrypted in transit; You can't request that data be deleted;
  Committed to follow the Play Families Policy.

## 7. Keep in sync

Change this file **and** `docs/privacy-policy.md` / the live privacy page **and** the Play Console form
together whenever any of these change: the ads SDK version, a new SDK, a new permission, a new
network call, or Google's AdMob disclosure page.
