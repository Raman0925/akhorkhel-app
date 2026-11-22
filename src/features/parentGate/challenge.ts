/**
 * Parent-gate challenge: "Tap the numbers in this order", with the numbers written as words.
 * A pre-reader cannot read the words; a grown-up passes in a few seconds. Pure, so it is unit-tested.
 */

/** Digits shown on the keypad, in keypad order. */
export const KEYPAD_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type Digit = (typeof KEYPAD_DIGITS)[number];

/** How many numbers the grown-up must tap. */
export const CHALLENGE_LENGTH = 3;

/** Wrong taps allowed before a fresh challenge is shown (generous, no time pressure). */
export const MAX_MISSES = 3;

export type Challenge = { order: Digit[] };

/** A new challenge of distinct digits. `rng` returns [0, 1) like Math.random (injectable for tests). */
export function createChallenge(rng: () => number = Math.random, previous?: Challenge): Challenge {
  for (let attempt = 0; attempt < 10; attempt++) {
    const pool: Digit[] = [...KEYPAD_DIGITS];
    const order: Digit[] = [];
    while (order.length < CHALLENGE_LENGTH) {
      const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
      order.push(pool.splice(i, 1)[0] as Digit);
    }
    if (!previous || !sameOrder(order, previous.order)) {
      return { order };
    }
  }
  // The rng kept repeating the previous challenge (only possible with a fixed test rng): rotate it.
  const [first, ...rest] = previous?.order ?? [1, 2, 3];
  return { order: [...rest, first] as Digit[] };
}

function sameOrder(a: readonly Digit[], b: readonly Digit[]): boolean {
  return a.length === b.length && a.every((d, i) => d === b[i]);
}

export type GateProgress = { step: number; misses: number };
export type TapResult =
  | { kind: 'progress'; state: GateProgress }
  | { kind: 'passed' }
  | { kind: 'miss'; state: GateProgress }
  | { kind: 'newChallenge' };

export const START: GateProgress = { step: 0, misses: 0 };

/** Applies one keypad tap. A wrong tap restarts the sequence; too many misses ask for a new challenge. */
export function tap(challenge: Challenge, state: GateProgress, digit: Digit): TapResult {
  if (challenge.order[state.step] === digit) {
    const step = state.step + 1;
    return step >= challenge.order.length
      ? { kind: 'passed' }
      : { kind: 'progress', state: { step, misses: state.misses } };
  }
  const misses = state.misses + 1;
  return misses >= MAX_MISSES
    ? { kind: 'newChallenge' }
    : { kind: 'miss', state: { step: 0, misses } };
}
