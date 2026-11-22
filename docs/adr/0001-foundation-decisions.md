# ADR 0001: Foundation decisions

Date: 2026-11-22 · Status: accepted

1. **Kotlin namespace `app.akhorkhel`, applicationId `in.akhorkhel.app`.** `in` is a Kotlin keyword,
   so the code package differs from the Play package name.
2. **No i18n library.** Each feature owns a typed `strings.ts` (`defineStrings`/`useStrings`). Avoids a
   dependency and merge conflicts on one big JSON file.
3. **Glyph geometry is generated from the font, not hand-drawn.** `tools/glyph-geometry.ts` shapes each
   letter/sign/numeral with HarfBuzz (so conjuncts and vowel-sign reordering are correct), stores the
   outline as an SVG path in a unit box, and derives _placeholder_ strokes by skeletonising the
   outline. Placeholder strokes are marked `strokeSource: "auto"` and the release gate rejects them:
   a native writer must review them or record new ones in the Stroke Recorder. The canvas draws the
   outline path, so the guide and the scorer use exactly the same geometry.
4. **zod only in tools and tests.** The app imports schema types with `import type`; zod is never bundled.
5. **No splash library.** The window background colour is the splash; first render is fast.
6. **Ad unit IDs are written at build time** from CI secrets into a generated file on tag builds;
   every other build uses Google's test IDs. No runtime config, no server.
7. **Sound effects are synthesised** with react-native-audio-api oscillators: no asset files or licences.
8. **Release gate:** CI tag builds fail unless every shipped pack is verified, all audio/images/prompts
   exist, no placeholder emoji remain and no strokes are `auto`.
