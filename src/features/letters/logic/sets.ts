/**
 * Set logic for the letter grid (handover 3.2): a set is 5 letters traced since the grid session
 * began. A letter counts once, when a new trace attempt for it is recorded in the progress store.
 */
import type { ItemProgress } from '@/progress';

export const SET_SIZE = 5;

/** Attempts per item key at the moment the grid session began. */
export type Baseline = Record<string, number>;

export function takeBaseline(progress: Record<string, ItemProgress>, keys: string[]): Baseline {
  const out: Baseline = {};
  for (const key of keys) {
    out[key] = progress[key]?.attempts ?? 0;
  }
  return out;
}

/** Distinct letters with at least one new attempt since the baseline. */
export function tracedSince(
  baseline: Baseline,
  progress: Record<string, ItemProgress>,
  keys: string[],
): number {
  let n = 0;
  for (const key of keys) {
    if ((progress[key]?.attempts ?? 0) > (baseline[key] ?? 0)) {
      n++;
    }
  }
  return n;
}

/** Number of full sets done in this session. */
export function setsDone(traced: number): number {
  return Math.floor(traced / SET_SIZE);
}
