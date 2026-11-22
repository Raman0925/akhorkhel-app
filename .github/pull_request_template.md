## What and why

<!-- One or two sentences. Link the issue: Closes #123 -->

## Agent role

<!-- A1 Foundation / A2 Tracing / A3 Content & Audio / A4 Learning UI / A5 Profiles-Teacher-Parent / A6 QA / A7 Store / A8 Monetization -->

## Test plan

- [ ] `npm run check` passes locally
- [ ] Tried on a device or emulator (steps below)
- [ ] Works in airplane mode (if it touches a lesson)

## Screenshots / video

## Reviewer checklist (handover 7.3)

- [ ] Strict types, tests added or updated
- [ ] No new SDK outside handover section 4; no analytics; no network calls except AdMob; no AD_ID
- [ ] No server code, "future version" stubs or TODOs
- [ ] Ads never on tracing or game screens, never at launch; caps respected; rewarded only behind the parent gate
- [ ] No invented language content (letters, words, translations, audio)
- [ ] Touch targets ≥ 64dp; strings in feature `strings.ts` (as + en)
- [ ] No per-point React re-renders while drawing
