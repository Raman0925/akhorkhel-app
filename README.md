# Akhor Khel · আখৰ খেল

An Android app that teaches children aged 3–8 to see, hear, trace and write **Assamese** letters,
with **Bodo** and **Mising** packs. Lessons work fully offline, progress stays on the device, and
there is no backend. Revenue comes from Families-compliant AdMob ads only.

- Product spec: [docs/HANDOVER.md](docs/HANDOVER.md)
- How the team (and agents) work: [docs/agents.md](docs/agents.md) · [CONTRIBUTING.md](CONTRIBUTING.md)
- Content rules and the native-speaker workflow: [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)
- Decisions: [docs/adr](docs/adr)

## Stack

React Native 0.88 (CLI, New Architecture, Hermes) · TypeScript strict · Skia · Gesture Handler 3 ·
Reanimated 4 · React Navigation 7 · MMKV · zustand · react-native-audio-api · AdMob.

## Develop

```sh
npm ci
npm run android        # debug build on a device/emulator (Metro starts automatically)
npm run check          # lint + typecheck + tests + pack validation (same as CI)
```

Requirements: Node ≥ 22.11, JDK 17, Android SDK 36.

## Release

Releases are built by GitHub Actions from a `v*` tag. The tag build runs the **release gate**
(`npm run validate-packs:release`): every shipped language pack must be `verified` by a native
reviewer, with recorded audio, illustrations and reviewed strokes. See
[docs/RELEASE.md](docs/RELEASE.md) for secrets and Play Console steps.
