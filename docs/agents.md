# Agents, ownership and contracts

| Role                       | Owns                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A0 Lead                    | `docs/`, frozen contracts, merges                                                                                                               |
| A1 Foundation              | `src/app`, `src/navigation`, `src/theme`, `src/ui`, `src/storage`, `src/i18n`, `.github/`, `android/`                                           |
| A2 Tracing                 | `src/features/tracing`, `tools/svg-to-strokes.ts`                                                                                               |
| A3 Content & Audio         | `src/content`, `src/audio`, `tools/validate-packs.ts`, `tools/glyph-geometry.ts`, `tools/gen-asset-manifest.ts`, fonts, `docs/CONTENT_GUIDE.md` |
| A4 Learning UI             | `src/features/{home,letters,swarachihna,games,words,numbers}`                                                                                   |
| A5 Profiles/Teacher/Parent | `src/features/{profiles,teacher,parentGate,parentArea}`                                                                                         |
| A6 QA/Reviewer             | `e2e/`, reviews, ads policy audit                                                                                                               |
| A7 Store & Compliance      | `docs/store`, `docs/privacy-policy.md`, `docs/RELEASE.md`                                                                                       |
| A8 Monetization            | `src/monetization`                                                                                                                              |

## Frozen contracts (change only via ADR)

| Contract       | File                         | Use                                                                                              |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Content schema | `src/content/schema.ts`      | Types of packs, letters, signs, words, numbers, geometry                                         |
| Pack registry  | `src/content/packs/index.ts` | `PACKS`, `getPack`, `packAsset`                                                                  |
| Routes         | `src/navigation/routes.ts`   | Every screen and its params                                                                      |
| AudioPlayer    | `src/audio/AudioPlayer.ts`   | `audio.playPack`, `audio.playPrompt`, `audio.sfx`, `audio.preload`                               |
| Audio presence | `src/audio/assets.ts`        | `hasPackAudio`, `hasPrompt`, `usePromptAvailable` (hide speakers without audio, ADR 0004)        |
| Voice prompts  | `src/audio/prompts.ts`       | Prompt ids + recording script                                                                    |
| Progress store | `src/progress/progress.ts`   | `useProgress().record(profileId, packId, itemKey, level, stars)`                                 |
| Profiles       | `src/progress/profiles.ts`   | `useProfiles`, `useCurrentProfile`, 40 max                                                       |
| Settings       | `src/storage/settings.ts`    | `useSettings` (packId, uiLanguage, leftHanded, sessions…)                                        |
| Ads            | `src/monetization/index.tsx` | `initAds`, `BannerSlot`, `useAds().onSetComplete`, `resetAdsState`, `useActiveStickers`          |
| i18n           | `src/i18n`                   | `defineStrings` + `useStrings` per feature (`features/<x>/strings.ts`)                           |
| UI kit         | `src/ui`                     | `Screen` (voice prompt + banner slot), `Header`, `BigButton`, `IconButton`, `StarRow`, `usePack` |

## Item keys

`letter:<id>`, `sign:<id>`, `number:<value>`, `word:<id>`, `game:<name>` — shared by geometry,
progress and the Trace route (`Trace { itemKey }`).

## Working agreement for AI agents

- Read docs/HANDOVER.md and this file first. Work only in folders your role owns.
- Branch, commit (Conventional Commits), push, open a PR with `gh pr create` against `main`.
- A6 reviews with `gh pr review --comment` (all agents share one GitHub account, so GitHub cannot
  record an "approval" from a different user; the A6 review comment plus green CI is the gate).
