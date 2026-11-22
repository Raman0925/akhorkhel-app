# Store graphics specification

Brief for the illustrator / designer. Play's asset requirements checked on 22 Nov 2026
(<https://support.google.com/googleplay/android-developer/answer/9866151>). Graphics must show the
real app: no feature, language or screen in a screenshot that is not in the release build.

## How to generate

Everything below is generated from source in the repo; nothing is drawn by hand in an image editor.

**One click (recommended):** GitHub → Actions → **Store assets** → _Run workflow_ (or
`gh workflow run store-assets.yml --ref main`). It builds the release APK (x86_64, debug-signed),
runs `e2e/screenshots/store.yaml` with Maestro on three Android 16 emulators (phone 1080 × 2400,
7" tablet 1200 × 1920 and 10" tablet 1600 × 2560, both at 320 dpi) in Assamese and English, frames
the captures and renders the graphics. Download the artifact **play-store-assets**:

```text
icon-512.png
feature-graphic-1024x500.png
screenshots/phone/screenshot-{as,en}-01..08.png      1080 × 1920
screenshots/tablet7/screenshot-{as,en}-01..08.png    1152 × 2048
screenshots/tablet10/screenshot-{as,en}-01..08.png   1440 × 2560
raw/<device>/<lang>-<NN>-<slug>.png                  unframed captures
```

**Locally:**

| Command                                                  | Does                                                                                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run store:graphics`                                 | Renders `docs/store/graphics/icon-512.png`, `feature-graphic-1024x500.png` and every launcher icon in `android/app/src/main/res` (legacy, round, adaptive + themed). Commit the result. |
| `maestro test e2e/screenshots/store.yaml -e APP_LANG=as` | With an emulator running the release APK: writes `as-01-trace.png` … `as-08-teacher.png` (use `APP_LANG=en` for English). Move them to `store-assets/raw/phone/`.                       |
| `npm run store:frame`                                    | Frames `store-assets/raw/<device>/*.png` into `store-assets/screenshots/<device>/screenshot-<lang>-<NN>.png` (`--in` / `--out` to change folders).                                      |

Sources: the mascot is `assets/brand/mascot-rhino.svg` (hand-written SVG); "ক" and all text are
shaped from the app's Noto Sans Bengali / Noto Sans with HarfBuzz and drawn as paths, so the output
never depends on system fonts. `assets/brand/icon.svg` and `feature-graphic.svg` are the composed
results (generated). Captions live in `docs/store/screenshot-captions.json`. Tools:
`tools/store-graphics.ts`, `tools/frame-screenshots.ts`, `tools/ci/store-screenshots.sh`.

The screenshot run is the app's first session on a fresh install, so no ad can show (ads never
start in session 1); keep it that way when changing the flow.

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

Status: **done** (`npm run store:graphics`). The default React Native launcher icon is replaced by
the same design: legacy `ic_launcher` / `ic_launcher_round` at mdpi–xxxhdpi, an adaptive icon
(`mipmap-anydpi-v26`: sunny-yellow background colour, foreground PNG per density) and a monochrome
"ক" layer for Android 13+ themed icons. The artwork keeps its important parts inside the adaptive
icon's 66 dp safe circle.

## 2. Feature graphic — 1024 × 500

| Spec          | Value                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Size / format | 1024 × 500 px, JPEG or 24-bit PNG (no alpha)                                                                                                                        |
| Content       | Left: a big "অ" on the tracing card (start dot, numbered dashed strokes, ink, arrow) with the mascot beside it. Right: "আখৰ খেল" large, "Akhor Khel" smaller below. |
| Safe area     | Keep text and the mascot's face inside the centre ~80%; Play may crop or overlay a play button when a video is set.                                                 |
| Text          | Name, plus the plain description line of screenshot 1 in both languages. No claims ("free", "best", …).                                                             |
| Variants      | One version works for both the English and Assamese listings (name is bilingual).                                                                                   |

## 3. Phone screenshots — 8

| Spec   | Value                                                                                                                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format | JPEG or 24-bit PNG (no alpha), max 8 MB each                                                                                                                                                                                     |
| Size   | 1080 × 1920 px portrait (9:16). Play allows 320–3,840 px per side with the long side ≤ 2.3 × the short side.                                                                                                                     |
| Count  | 8 (Play allows 2–8 phone screenshots)                                                                                                                                                                                            |
| Layout | Top ~20%: caption band (Assamese line large, English line smaller in the English listing; Assamese only in the Assamese listing). Below: a real screen capture from a release build with test content replaced by final content. |
| Banner | Capture with ads off (a debug build that hides `BannerSlot`), or crop the banner strip. Never show a live ad.                                                                                                                    |

Captions (an Assamese read-through, as for `listing-as.md`, is recommended). The first release has
no recorded audio, sound games or picture words (ADR 0004), so no screenshot shows a speaker
button, a sound game or a bridge card:

| #   | Screen                                                                                   | Caption — Assamese (draft)             | Caption — English                          |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| 1   | Tracing "ক" at Level 1: start dot, numbered strokes, animated arrow, a finger mid-stroke | আঁচে আঁচে ক খ লিখিবলৈ শিকক               | Trace each letter, stroke by stroke        |
| 2   | Letter screen: big "অ" with the trace button                                             | চাওক, লিখক                             | See it, write it                           |
| 3   | Three-level selector / Level 3 blank page with stars                                     | সহায়ৰ পৰা নিজে লিখালৈ – তিনিটা স্তৰ     | Three levels: guided, faded, from memory   |
| 4   | Letter grid showing স্বৰবৰ্ণ and ব্যঞ্জনবৰ্ণ tabs with stars                                  | সম্পূৰ্ণ অসমীয়া বৰ্ণমালা                   | The full Assamese alphabet                 |
| 5   | Vowel sign screen: ক + া = কা                                                            | কাৰ: ক + া = কা                        | Vowel signs made simple                    |
| 6   | Numbers screen / counting objects                                                        | সংখ্যা ১–২০                             | Numbers 1 to 20                            |
| 7   | Language picker / Bodo letter grid                                                       | বড়ো বৰ্ণমালাও                           | The Bodo alphabet too                      |
| 8   | Teacher mode class grid (fictional nicknames)                                            | শ্ৰেণীৰ বাবে – ৪০টালৈকে প্ৰ'ফাইল, অফলাইন | For classrooms: 40 profiles, works offline |

Notes:

- Screenshot 1 is the most important (first impression). The arrow and the numbered strokes must be
  clearly visible; capture mid-animation or add a static arrow overlay matching the app's style.
- Screenshot 7 shows only languages that are in the release build; drop any that is not (from the
  caption and the listing too). If none is left, use the vowel-sign list instead.
- Use fictional nicknames in screenshot 8 (e.g. "Moina", "Bitu"), never real children's names or
  photos.
- 7-inch and 10-inch tablet screenshots are generated too (same flow and captions, portrait).
  Upload them only once the app has been checked on a real tablet; phone screenshots are enough
  otherwise.
- Screenshot 1 is taken right after the stroke demo, so the start dot, the numbered dashed strokes
  and the moving arrow are visible; the flow cannot draw a curved finger stroke, so there is no
  ink in it. Star counts on the grid come from straight-swipe traces (1–2 stars).

## 4. Preview video — 30 seconds

| Spec     | Value                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------- |
| Host     | YouTube, public or unlisted, embeddable, **not** age-restricted, **monetisation off** (no ads)     |
| Length   | 30 s (only the first 30 s autoplay on Play); show the app in use within the first 10 s             |
| Format   | 1080 × 1920 portrait or 1920 × 1080 landscape; screen recording of a release build + simple titles |
| Audio    | A light instrumental track that is royalty-free with a licence on file (no recorded voices yet)    |
| Captions | Burned-in bilingual captions (many parents watch muted)                                            |
| YouTube  | "Made for kids" setting: **Yes** (it is child-directed content)                                    |

Storyboard:

| Time    | Picture                                                                                  | Sound / caption                                |
| ------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 0–3 s   | Mascot waves; title card "আখৰ খেল · Akhor Khel"                                          | Music; caption: আখৰ খেল · Akhor Khel           |
| 3–10 s  | Finger traces "ক": start dot, arrow, numbered strokes; stroke turns green; 3 stars burst | Caption: আঁচে আঁচে লিখক · Trace stroke by stroke |
| 10–14 s | Level 2 faded guide, then Level 3 blank page, child writes "খ"                           | Caption: তিনিটা স্তৰ · Three levels             |
| 14–17 s | Letter screen "অ": tap the trace button                                                  | Caption: চাওক, লিখক · See it, write it         |
| 17–20 s | Vowel sign: ক + া slides together into কা                                                | Caption: কাৰ · Vowel signs                     |
| 20–23 s | Counting objects; the running numeral grows; gentle celebration                          | Caption: সংখ্যা ১–২০ · Numbers 1 to 20          |
| 23–26 s | Bodo letter grid                                                                         | Caption: বড়ো · Bodo                            |
| 26–28 s | Teacher class grid; airplane-mode icon                                                   | Caption: অফলাইনত চলে · Works offline           |
| 28–30 s | Mascot + icon + name                                                                     | Caption: আখৰ খেল · Akhor Khel                  |

Same rules as screenshots: no live ads in the video; Bodo shots only while the Bodo pack ships.

## 5. Deliverables checklist

- [x] `icon-512.png` (also exported to the launcher icon set) — `docs/store/graphics/`
- [x] `feature-graphic-1024x500.png` — `docs/store/graphics/`
- [x] `screenshot-en-01.png` … `screenshot-en-08.png` — Store assets workflow
- [x] `screenshot-as-01.png` … `screenshot-as-08.png` — Store assets workflow
- [ ] Review of the generated art and the screenshots by the owner before upload
- [ ] YouTube URL of the 30 s video (made for kids, monetisation off)
- [ ] Optional: Assamese read-through of every caption, noted in `listing-as.md`

Keep source files (layered) outside the repo or in a design drive; do not commit large binaries
unless the repo owner agrees.
