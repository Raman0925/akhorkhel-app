# ADR 0004: Launch without the native-review gate and without recorded audio

Date: 2026-11-22 · Status: accepted (owner decision) · Amends the frozen content schema
(`src/content/schema.ts`) and the AudioPlayer contract (ADR 0001), handover 5.1, 6 and 7.4 ·
Supersedes the release-gate rules in `docs/CONTENT_GUIDE.md` and `docs/RELEASE.md` section 8

## Context

The release gate (`npm run validate-packs:release`) refused to build unless every shipped pack was
marked `verified` with reviewer names in `reviewedBy`, every glyph's strokes had been reviewed or
recorded (no `strokeSource: "auto"`), and every letter, sign, number, word and voice prompt had a
native recording. Two things changed:

1. **Review.** The owner reports that an Assamese-speaking reviewer checked the content and asked for
   the review tag to be removed. The reviewer does not want a name in the app.
2. **Audio.** No native recordings that the project may use for free exist, and the owner does not
   want to delay the first release for them.

The owner publishes through an **organization** Google Play developer account and releases straight
to production after an internal smoke test (see `docs/RELEASE.md`).

## Decision

1. **No native-review gate.** `status`, `reviewedBy`, `PackStatusSchema` and `ReviewerSchema` are
   removed from the pack schema, from every `pack.json` and from the validator. Old files that still
   carry the fields are accepted (zod drops unknown keys). No reviewer names are recorded.
2. **`auto` strokes may ship.** The `strokeSource` field stays (`auto` / `reviewed` / `recorded`)
   and the geometry tool still never overwrites `reviewed` or `recorded` entries. The validator only
   warns about `auto` strokes.
3. **Recorded audio is optional.** The release gate does not require audio, image or prompt files;
   missing files and missing number words are warnings. Audio stays fully supported: adding `.m4a`
   files at the paths in `pack.json` / `src/audio/prompts/<as|en>/` and running
   `npm run gen:assets` makes them play with no code change.
4. **No silent buttons.** `@/audio` exports `hasPackAudio(packId, path)`, `hasPrompt(id, lang?)`
   (UI language, falling back to Assamese), `promptAsset` and the hook `usePromptAvailable(id)`.
   Every speaker / replay / listen button is hidden while its file is missing: the `Header`
   speaker, the Home speaker, and the listen buttons on the Letter, Sign, Number and Word screens.
   Tap targets on the big letter / numeral / picture stay (they are silent without audio) but lose
   "Listen" from their accessibility label.
5. **Sound games need letter audio.** "Tap the letter you hear" and "Which picture starts with this
   sound?" only use letters whose sound is bundled. GamesHub hides a game that has too few audible
   letters, and Home hides the Games tile when no game is playable. With no recordings at all
   (the launch state) the Games module is hidden.
6. **Release gate** = all integrity checks (schema, NFC, unique ids, references, geometry present
   and current, outlines valid, strokes non-empty, vowel-sign syllables) **plus** no
   `placeholderEmoji` words. The CI step names are unchanged.
7. Synthesised sound effects and the sound on/off setting are unchanged.

## Consequences

- The app can ship now with Letters, Vowel signs, Words (text and pictures where available) and
  Numbers, all with tracing; the sound games appear automatically once letter audio is added.
- Content accuracy rests on the owner's informal review. Native review stays recommended for any
  future content change (`docs/CONTENT_GUIDE.md`), and `auto` stroke orders may be imperfect.
  The reported review was by an Assamese speaker; the Bodo pack (`brx-deva`) is also registered
  and ships under this decision, so a Bodo speaker's check is advisable.
- Store listing, screenshots and privacy policy must not advertise recorded voices or sound games
  until the recordings exist.
- Tests mock the generated asset maps (`jest/mocks/assets.ts`, `mockAudio('all' | 'none' | keys)`)
  and cover both the "audio present" and "audio missing" states.
