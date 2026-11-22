/**
 * Parent-gate challenge: a two-digit × one-digit multiplication (e.g. 14 × 6) typed on a keypad.
 * Children aged 3–8 cannot solve it, it is not app content, and random tapping has roughly a
 * 1-in-1000 chance per try. Three wrong answers lock the gate for 30 seconds. Pure: unit-tested.
 */

export type Challenge = { a: number; b: number; answer: number };

/** Wrong answers allowed before the cooldown. */
export const MAX_MISSES = 3;
/** Cooldown after MAX_MISSES wrong answers (ms). */
export const COOLDOWN_MS = 30_000;
/** Longest answer the keypad accepts (19 × 9 = 171). */
export const MAX_ANSWER_DIGITS = 3;

/** A new question: a in 11–19, b in 3–9. `rng` returns [0, 1) like Math.random (injectable). */
export function createChallenge(rng: () => number = Math.random, previous?: Challenge): Challenge {
  const pick = (min: number, max: number) =>
    min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));
  for (let attempt = 0; attempt < 10; attempt++) {
    const a = pick(11, 19);
    const b = pick(3, 9);
    if (!previous || previous.a !== a || previous.b !== b) {
      return { a, b, answer: a * b };
    }
  }
  // Only reachable with a fixed test rng: step to a different question.
  const a = previous!.a === 19 ? 11 : previous!.a + 1;
  return { a, b: previous!.b, answer: a * previous!.b };
}

/** Gate state. Kept in memory only (never persisted). */
export type GateState = { misses: number; lockedUntil: number };
export const INITIAL_STATE: GateState = { misses: 0, lockedUntil: 0 };

export function isLocked(state: GateState, now: number): boolean {
  return now < state.lockedUntil;
}

/** Whole seconds left in the cooldown (0 when the gate is open again). */
export function secondsLeft(state: GateState, now: number): number {
  return Math.max(0, Math.ceil((state.lockedUntil - now) / 1000));
}

export type SubmitResult =
  | { kind: 'passed'; state: GateState }
  | { kind: 'wrong'; state: GateState }
  | { kind: 'locked'; state: GateState };

/** Checks a typed answer. Every wrong answer counts; the third starts the cooldown. */
export function submit(
  challenge: Challenge,
  input: string,
  state: GateState,
  now: number,
): SubmitResult {
  if (isLocked(state, now)) {
    return { kind: 'locked', state };
  }
  if (input !== '' && Number(input) === challenge.answer) {
    return { kind: 'passed', state: INITIAL_STATE };
  }
  const misses = state.misses + 1;
  if (misses >= MAX_MISSES) {
    return { kind: 'locked', state: { misses: 0, lockedUntil: now + COOLDOWN_MS } };
  }
  return { kind: 'wrong', state: { misses, lockedUntil: 0 } };
}

/** Adds a keypad digit, ignoring extra digits and leading zeros. */
export function appendDigit(input: string, digit: number): string {
  if (input.length >= MAX_ANSWER_DIGITS || (input === '' && digit === 0)) {
    return input;
  }
  return input + String(digit);
}
