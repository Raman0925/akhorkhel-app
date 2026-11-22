# Store graphics specification

Brief for the illustrator / designer. Play's asset requirements checked on 22 Nov 2026
(<https://support.google.com/googleplay/android-developer/answer/9866151>). Graphics must show the
real app: no feature, language or screen in a screenshot that is not in the release build.

## Brand basics

- **Mascot:** an original baby one-horned rhino (Kaziranga) wearing a red-and-white gamosa around
  its neck. Friendly, round, flat-colour style matching the in-app illustrations (HANDOVER
  sections 6 and 8). Not based on any existing character.
- **Colours:** bright, calm palette from `src/theme` (use the same tokens as the app).
- **Type:** Noto Sans Bengali for Assamese, Noto Sans for English (both OFL, already in the app).
  Never fake Assamese text with a Bengali font that lacks ৰ / ৱ.
- **Rules for all graphics (Play metadata policy):** no "free", "#1", "best", "new", price or
  ranking claims; no Play badges or "Teacher Approved" unless granted; no device frames with
  other brands; no ads shown in screenshots.

## 1. App icon — 512 × 512

| Spec          | Value                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Size / format | 512 × 512 px, 32-bit PNG (with alpha), max 1,024 KB                                                                         |
| Shape         | Full square artwork; Play applies the rounded mask and shadow. Do not add your own rounding or shadow.                      |
| Content       | Baby rhino head in the gamosa, holding or next to a large **"ক"** in a contrasting colour. The ক must be readable at 48 px. |
| Background    | Solid or simple two-tone; no text other than ক.                                                                             |
| Consistency   | The launcher icon (`android/app/src/main/res/mipmap-*`, adaptive icon foreground/background) must be the same design.       |

## 2. Feature graphic — 1024 × 500

| Spec          | Value                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Size / format | 1024 × 500 px, JPEG or 24-bit PNG (no alpha)                                                                                   |
| Content       | Left: mascot tracing a big "অ" with a finger, a dotted guide and an arrow. Right: "আখৰ খেল" large, "Akhor Khel" smaller below. |
| Safe area     | Keep text and the mascot's face inside the centre ~80%; Play may crop or overlay a play button when a video is set.            |
| Text          | Name only. No tagline claims.                                                                                                  |
| Variants      | One version works for both the English and Assamese listings (name is bilingual).                                              |

## 3. Phone screenshots — 8

| Spec   | Value                                                                                                                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format | JPEG or 24-bit PNG (no alpha), max 8 MB each                                                                                                                                                                                     |
| Size   | 1080 × 1920 px portrait (9:16). Play allows 320–3,840 px per side with the long side ≤ 2.3 × the short side.                                                                                                                     |
| Count  | 8 (Play allows 2–8 phone screenshots)                                                                                                                                                                                            |
| Layout | Top ~20%: caption band (Assamese line large, English line smaller in the English listing; Assamese only in the Assamese listing). Below: a real screen capture from a release build with test content replaced by final content. |
| Banner | Capture with ads off (a debug build that hides `BannerSlot`), or crop the banner strip. Never show a live ad.                                                                                                                    |

Captions (Assamese drafts need the same native review as `listing-as.md`):

| #   | Screen                                                                                   | Caption — Assamese (draft)             | Caption — English                          |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| 1   | Tracing "ক" at Level 1: start dot, numbered strokes, animated arrow, a finger mid-stroke | আঁচে আঁচে ক খ লিখিবলৈ শিকক               | Trace each letter, stroke by stroke        |
| 2   | Letter screen: big "অ", picture word, speaker button                                     | শুনক, চাওক, লিখক                        | See it, hear it, write it                  |
| 3   | Three-level selector / Level 3 blank page with stars                                     | সহায়ৰ পৰা নিজে লিখালৈ – তিনিটা স্তৰ     | Three levels: guided, faded, from memory   |
| 4   | Letter grid showing স্বৰবৰ্ণ and ব্যঞ্জনবৰ্ণ tabs with stars                                  | সম্পূৰ্ণ অসমীয়া বৰ্ণমালা                   | The full Assamese alphabet                 |
| 5   | Vowel sign screen: ক + া = কা                                                            | কাৰ: ক + া = কা                        | Vowel signs made simple                    |
| 6   | Sound game "Tap the letter you hear"                                                     | শুনি সঠিক আখৰটো বিচাৰক                  | Fun sound games                            |
| 7   | Language picker / Bodo or Mising bridge card (word + Assamese + English)                 | বড়ো আৰু মিচিং বৰ্ণমালাও                  | Bodo and Mising alphabets too              |
| 8   | Teacher mode class grid (fictional nicknames)                                            | শ্ৰেণীৰ বাবে – ৪০টালৈকে প্ৰ'ফাইল, অফলাইন | For classrooms: 40 profiles, works offline |

Notes:

- Screenshot 1 is the most important (first impression). The arrow and the numbered strokes must be
  clearly visible; capture mid-animation or add a static arrow overlay matching the app's style.
- Screenshot 7 only if the Bodo/Mising packs are verified and shipped. Otherwise replace it with the
  numbers screen (সংখ্যা ১–২০ / "Numbers 1 to 20") and remove Bodo/Mising from the listing.
- Use fictional nicknames in screenshot 8 (e.g. "Moina", "Bitu"), never real children's names or
  photos.
- Optional: 7-inch and 10-inch tablet screenshots only if the app is tested on tablets; it is
  portrait-locked, so phone screenshots are enough.

## 4. Preview video — 30 seconds

| Spec     | Value                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Host     | YouTube, public or unlisted, embeddable, **not** age-restricted, **monetisation off** (no ads)         |
| Length   | 30 s (only the first 30 s autoplay on Play); show the app in use within the first 10 s                 |
| Format   | 1080 × 1920 portrait or 1920 × 1080 landscape; screen recording of a release build + simple titles     |
| Audio    | The app's own voice prompts and a light instrumental track that is royalty-free with a licence on file |
| Captions | Burned-in bilingual captions (many parents watch muted)                                                |
| YouTube  | "Made for kids" setting: **Yes** (it is child-directed content)                                        |

Storyboard:

| Time    | Picture                                                                                  | Sound / caption                                                |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 0–3 s   | Mascot waves; title card "আখৰ খেল · Akhor Khel"                                          | Voice: "আহা, আখৰ খেলোঁ!" (final line from the recorded prompts) |
| 3–10 s  | Finger traces "ক": start dot, arrow, numbered strokes; stroke turns green; 3 stars burst | Caption: আঁচে আঁচে লিখক · Trace stroke by stroke                 |
| 10–14 s | Level 2 faded guide, then Level 3 blank page, child writes "খ"                           | Caption: তিনিটা স্তৰ · Three levels                             |
| 14–17 s | Letter screen "অ": tap speaker, picture word appears                                     | Recorded letter audio                                          |
| 17–20 s | Vowel sign: ক + া slides together into কা                                                | Caption: কাৰ · Vowel signs                                     |
| 20–23 s | Sound game: correct letter tapped, gentle celebration                                    | Caption: শব্দৰ খেল · Sound games                                |
| 23–26 s | Bodo and Mising bridge cards side by side                                                | Caption: বড়ো আৰু মিচিং · Bodo & Mising                          |
| 26–28 s | Teacher class grid; airplane-mode icon                                                   | Caption: অফলাইনত চলে · Works offline                           |
| 28–30 s | Mascot + icon + name                                                                     | Caption: আখৰ খেল · Akhor Khel                                  |

Same rules as screenshots: no live ads in the video; Bodo/Mising shots only if those packs ship.

## 5. Deliverables checklist

- [ ] `icon-512.png` (also exported to the launcher icon set)
- [ ] `feature-1024x500.png`
- [ ] `screenshot-en-01.png` … `screenshot-en-08.png`
- [ ] `screenshot-as-01.png` … `screenshot-as-08.png`
- [ ] YouTube URL of the 30 s video (made for kids, monetisation off)
- [ ] Native Assamese review of every caption, recorded in `listing-as.md`

Keep source files (layered) outside the repo or in a design drive; do not commit large binaries
unless the repo owner agrees.
