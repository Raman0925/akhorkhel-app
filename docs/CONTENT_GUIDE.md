# Content guide

How language content gets into Akhor Khel, who is responsible for each part, and what must be true
before a pack can ship. The rules come from handover section 6, ADR 0001 and ADR 0004; this guide
is the working procedure.

> **Since ADR 0004 (owner decision, 2026-11-22):** native review is **recommended, not required**
> (the pack schema has no `status` or `reviewedBy` any more), `auto` strokes may ship, and recorded
> audio is optional: the app launches without it and hides every speaker button and the sound games
> until the files exist.

**The one rule:** developers and AI agents never make up letters, spellings, words, translations,
stroke orders or audio. Every piece of language content comes from a named human authority, and the
pack records where it came from.

## 1. Where content lives

```
src/content/packs/<packId>/        packId = ISO 639-3 + ISO 15924, e.g. asm-beng
  pack.json        human-authored: letters, vowel signs, words, numbers, sources
  geometry.json    tool-maintained: outline + strokes for every traceable item
  audio/letters/<id>.m4a  audio/signs/<id>.m4a  audio/numbers/<n>.m4a  audio/words/<id>.m4a  (optional)
  images/words/<id>.webp                                                                    (optional)
src/audio/prompts/<as|en>/<promptId>.m4a   optional voice prompts (text in src/audio/prompts.ts)
android/app/src/main/assets/fonts/          Noto Sans fonts (OFL, see OFL.txt)
```

The schema is `src/content/schema.ts`. All text must be Unicode NFC (the validator checks it). Note
that ড় ঢ় য় and the Devanagari nukta letters are stored as base + nukta (U+09BC / U+093C), because
the precomposed code points are not NFC.

### Item ids

Ids are lower-case ASCII so they work as file names. They are keys, not pronunciation guides:

| Kind        | Scheme                                                                                                                                                                                                                                                                                  | Examples                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Vowels      | Sanskrit-style transliteration; long vowels doubled                                                                                                                                                                                                                                     | অ `a`, আ `aa`, ঈ `ii`, ঋ `ri`, ঐ `oi`, ঔ `ou`             |
| Consonants  | consonant + `a`; aspirates add `h`; retroflex doubled (`tta`, `dda`, `nna`); palatal nasal `nya`, velar nasal `nga`; sibilants শ `sha`, ষ `ssa`, স `sa`; ৰ `ra`, ৱ `wa`, য `ya`, য় `yya`, ড় `rra`, ঢ় `rha`, ক্ষ `ksha`; Devanagari ळ `lla`, व `va`, candra vowels `e-candra`, `o-candra` | ক `ka`, খ `kha`, ট `tta`                                  |
| Other signs | English name                                                                                                                                                                                                                                                                            | ৎ `khanda-ta`, ং `anusvara`, ঃ `visarga`, ঁ `chandrabindu` |
| Vowel signs | `<consonant id>-<vowel id>`                                                                                                                                                                                                                                                             | কা `ka-aa`, কি `ka-i`, কৌ `ka-ou`                         |
| Numbers     | the value                                                                                                                                                                                                                                                                               | `number:12`, audio `audio/numbers/12.m4a`                 |
| Words       | ASCII transliteration of the word, chosen by the reviewer                                                                                                                                                                                                                               | `kol` (only once a reviewer supplies the word)            |

Never rename an id once audio exists: file names depend on it.

## 2. Who supplies and reviews what

Review is recommended for every content change but is no longer enforced by the build (ADR 0004).
The table says who is best placed to check each part.

| Content                          | Authority / supplier                                                                         | Recommended reviewer                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Assamese alphabet and order      | Asam Sahitya Sabha order, confirmed by a native Assamese primary teacher                     | the teacher                                                     |
| Bodo alphabet and order          | Bodo Sahitya Sabha (Devanagari, since 1975)                                                  | a Bodo teacher or Sabha member                                  |
| Mising alphabet and order        | Mising Agom Kébang (Latin orthography incl. é)                                               | a Mising Agom Kébang member or Mising teacher                   |
| Number words, picture words      | the reviewer (dictionary and primers as reference only; CIIL/NCERT primers are never copied) | the same reviewer                                               |
| Bridge cards (Bodo/Mising)       | the reviewer of that language, with the Assamese and English gloss                           | the same reviewer + an Assamese reviewer for the Assamese gloss |
| Stroke order                     | a native writer/teacher, using the Stroke Recorder or by reviewing the placeholder strokes   | the writer, by setting `strokeSource`                           |
| Audio                            | native child-friendly voices (female and male) with signed consent                           | the reviewer listens to every file                              |
| Illustrations                    | original artwork by the project's illustrator (or written permission)                        | the Assamese reviewer checks cultural fit                       |
| Voice prompt text (`prompts.ts`) | drafted in English; Assamese translation by a native speaker                                 | the Assamese reviewer                                           |

### Recording sources

Every pack has a `sources` array. Each entry says what was taken from where and when it was read,
for example `"Letter inventory and order: <publication>, page 3, read 2026-11-22"`. A primer used
only for reference is still listed. If something is uncertain, write that in `sources` too.

### Reviewing a pack (recommended)

1. A native speaker goes through the pack item by item (letters and order, signs, numbers and
   number words, words and glosses, audio if any, strokes) using a debug build and
   `docs/RECORDING_SCRIPT.md`.
2. Fix everything they flag and regenerate (`npm run gen:geometry`, `npm run gen:assets`).
3. Mention the review in the commit or PR description. Reviewer names are not stored in the pack.

## 3. Audio

Audio is optional (ADR 0004). The first release ships without recordings; the app hides every
speaker / listen button whose file is missing, and the sound games ("Tap the letter you hear",
"Which picture starts with this sound?") stay hidden until enough letter audio exists (two letters
for the first game; one letter with pictured words for the second).

### Adding audio later (no code change)

1. Record and process the files to the spec below; keep signed consent outside the repo.
2. Put each file at the exact path listed in `docs/RECORDING_SCRIPT.md`: pack audio at
   `src/content/packs/<packId>/audio/...` (as named in `pack.json`), voice prompts at
   `src/audio/prompts/<as|en>/<promptId>.m4a`. You can add files a few at a time.
3. Run `npm run gen:assets` and commit the audio files together with the regenerated
   `src/content/packs/assets.generated.ts` and `src/audio/prompts.generated.ts` (CI fails if the
   generated files are stale).
4. Optionally run `npm run gen:recording-script` to update the "Recorded" column.

The matching buttons appear automatically, and the sound games appear once their letters can be
heard. A prompt recorded only in Assamese is also used when the UI is in English.

### Spec

- **Masters:** 44.1 kHz, 16-bit (or 24-bit) WAV, recorded in a quiet room, one item per file. Keep
  masters outside the repo (shared drive), together with the **signed consent forms** of every voice
  (a parent/guardian signs for a child). Consent forms never go into the repo.
- **Delivery files:** mono AAC in an `.m4a` container, ~32 kbps, 44.1 kHz; loudness normalised
  (about −16 LUFS integrated, peaks below −1 dBTP); leading/trailing silence trimmed to ~50 ms.
  Example with ffmpeg:
  ```sh
  ffmpeg -i ka.wav -af "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=1:stop_threshold=-50dB,loudnorm=I=-16:TP=-1" -ac 1 -ar 44100 -c:a aac -b:a 32k ka.m4a
  ```
- **Names:** exactly the paths in `pack.json` (`audio/letters/<id>.m4a`, …) and
  `src/audio/prompts/<as|en>/<promptId>.m4a`. `docs/RECORDING_SCRIPT.md` lists every file
  (`npm run gen:recording-script` refreshes it).
- After adding files run `npm run gen:assets` (Metro needs static `require()` maps) and commit the
  generated files. Missing files are silent in the app (with no speaker button) and only warnings
  in CI, including the release gate.
- Sound effects are synthesised in code; never add sound-effect files.

## 4. Images

- Original, flat illustrations rooted in Assamese life (gamosa, xorai, japi, rhino, tea garden…).
  No known characters, logos, photos of people, or traced copies of primer pictures.
- Square, 512×512 px, transparent or plain light background, WebP (`images/words/<id>.webp`),
  ideally under 40 KB each.
- Until an illustration exists a draft word may use `placeholderEmoji`; the release gate rejects it.

## 5. Strokes

`npm run gen:geometry` (`tools/glyph-geometry.ts`) shapes every letter, sign syllable and numeral
with HarfBuzz using the pack's font, stores the outline in the unit box and derives **placeholder**
strokes by skeletonising the outline (`strokeSource: "auto"`). The placeholder order is a heuristic
(body strokes top-to-bottom, left-to-right; the headline last, left to right). It can be wrong.
Since ADR 0004 `auto` strokes may ship (the validator only warns), but review by a native writer is
recommended.

A native writer improves an item in one of two ways:

1. **Review:** open the item in a dev build, watch the stroke animation. If the order, direction and
   shape are how children are taught to write it, set that entry's `strokeSource` to `"reviewed"`
   in `geometry.json`.
2. **Record:** in a dev build, open the Stroke Recorder (dev menu), draw each stroke in teaching
   order over the faint letter, export, and paste the strokes into `geometry.json` with
   `strokeSource: "recorded"`. Strokes drawn in a vector editor can be converted with
   `tools/svg-to-strokes.ts`.

The generator never overwrites `reviewed` or `recorded` entries. If an item's text changes, the
entry is regenerated as `auto` with a loud warning, and the writer should review it again.

## 6. Adding another language pack

Only with content from a named authority (handover 2.1); never invent content.

1. Choose the pack id (`<iso639-3>-<iso15924>`, lower case) and create
   `src/content/packs/<id>/pack.json` (copy the shape of an existing pack, `sources` filled) and
   an empty `geometry.json` (`{}`).
2. If the script needs a new font, add the official OFL static TTF to
   `android/app/src/main/assets/fonts/` (file name = `fontFamily`) and extend `OFL.txt`.
3. Register the pack in `src/content/packs/index.ts` (import both JSON files, add to `PACKS`).
4. `npm run gen:geometry && npm run gen:assets && npm run gen:recording-script && npm run validate-packs`.
5. Have a native speaker review it (section 2, recommended) and add audio when available
   (section 3, optional).

## 7. Release gate

`npm run validate-packs:release` (run by CI on tags) fails unless, for every registered pack:

- everything the normal validator checks passes (schema, NFC, unique ids, references, geometry
  present and up to date, outlines parse and stay inside the box, strokes non-empty, vowel-sign
  syllables equal base + sign);
- no word uses `placeholderEmoji`.

Missing audio, images, voice prompts and number words, and `auto` strokes, are reported as
warnings only (ADR 0004).
