# Contributing

1. Open or pick a GitHub issue. Ask questions in an issue labelled `question` instead of guessing.
2. Branch from `main`: `feat/<area>-<short-name>`, `fix/...`, `chore/...`.
3. Keep PRs under ~400 changed lines (generated files excluded), with a test plan and screenshots.
4. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) (enforced by commitlint).
5. `npm run check` must pass. CI must be green. A reviewer other than the author (A6 by default)
   reviews against the checklist in the PR template. Squash-merge.

## Rules that are never broken

- No backend, analytics, remote config or SDKs outside docs/HANDOVER.md section 4.
- Ads only through `src/monetization` (ESLint enforces it), never on tracing or game screens, never at launch.
- Never invent letters, words, translations, strokes or audio for any language. Use clearly marked
  placeholders in draft packs and open a `content` issue.
- Every lesson works offline.
- Dependencies are stable releases, pinned exactly (`npm i -E`).

## Ownership

Each folder has an owner role (docs/agents.md). Change another role's folder only through a PR that
the owner reviews. Frozen contracts change only through an ADR in docs/adr.
