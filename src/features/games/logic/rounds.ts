/**
 * Pure round generation for the sound games. Deterministic when given a seeded RNG, so tests can
 * check exact rounds. No React, no audio.
 */
import type { Letter, Word } from '@/content';

/** Returns a float in [0, 1), like Math.random. */
export type Rng = () => number;

/** Small seeded RNG (Park–Miller) for tests and reproducible rounds. */
export function seededRng(seed: number): Rng {
  const M = 2147483647;
  let state = (Math.abs(Math.floor(seed)) % (M - 1)) + 1;
  return () => {
    state = (state * 16807) % M;
    return (state - 1) / (M - 1);
  };
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * Pick `count` targets from `pool`: no item repeats until every item has been used, and never the
 * same item twice in a row (when the pool has more than one item).
 */
export function pickTargets<T>(pool: readonly T[], count: number, rng: Rng): T[] {
  if (pool.length === 0) {
    return [];
  }
  const out: T[] = [];
  while (out.length < count) {
    let batch = shuffle(pool, rng);
    const last = out[out.length - 1];
    if (pool.length > 1 && batch[0] === last) {
      // Move the repeated item to the end of the new batch.
      batch = [...batch.slice(1), batch[0] as T];
    }
    out.push(...batch.slice(0, count - out.length));
  }
  return out;
}

export const ROUNDS_PER_GAME = 5;

/** Letters that can be heard: unique glyphs (so two choices never look the same). */
function uniqueByGlyph(letters: readonly Letter[]): Letter[] {
  const seen = new Set<string>();
  return letters.filter(l => {
    if (seen.has(l.glyph)) {
      return false;
    }
    seen.add(l.glyph);
    return true;
  });
}

/** 4 choices for bigger packs, 3 for small ones, 2 for tiny ones. */
export function hearChoiceCount(letterCount: number): number {
  if (letterCount >= 8) {
    return 4;
  }
  return Math.min(3, letterCount);
}

export function canPlayHear(letters: readonly Letter[]): boolean {
  return uniqueByGlyph(letters).length >= 2;
}

export type HearRound = { target: Letter; choices: Letter[] };

/** "Tap the letter you hear": each round has a target and distinct distractors, shuffled. */
export function makeHearRounds(
  letters: readonly Letter[],
  rng: Rng,
  count = ROUNDS_PER_GAME,
): HearRound[] {
  const pool = uniqueByGlyph(letters);
  if (pool.length < 2) {
    return [];
  }
  const n = hearChoiceCount(pool.length);
  return pickTargets(pool, count, rng).map(target => {
    const distractors = shuffle(
      pool.filter(l => l.id !== target.id),
      rng,
    ).slice(0, n - 1);
    return { target, choices: shuffle([target, ...distractors], rng) };
  });
}

export const PICTURE_CHOICES = 3;

/** A word can be a picture choice if it is not a bonus word, has a picture and a known first letter. */
export function pictureWords(
  words: readonly Word[],
  letters: readonly Letter[],
  hasPicture: (w: Word) => boolean,
): Word[] {
  const letterIds = new Set(letters.map(l => l.id));
  return words.filter(
    w => !w.bonus && w.startsWith !== undefined && letterIds.has(w.startsWith) && hasPicture(w),
  );
}

/** Letters that can be a picture-round target: some word starts with it, and enough others don't. */
function pictureTargets(words: readonly Word[], letters: readonly Letter[]): Letter[] {
  return letters.filter(l => {
    const starting = words.filter(w => w.startsWith === l.id).length;
    const others = words.length - starting;
    return starting >= 1 && others >= PICTURE_CHOICES - 1;
  });
}

/** `words` must already be filtered with `pictureWords`. */
export function canPlayPicture(words: readonly Word[], letters: readonly Letter[]): boolean {
  return pictureTargets(words, letters).length > 0;
}

export type PictureRound = { letter: Letter; answer: Word; choices: Word[] };

/** "Which picture starts with this sound?": one word starts with the letter, the others don't. */
export function makePictureRounds(
  words: readonly Word[],
  letters: readonly Letter[],
  rng: Rng,
  count = ROUNDS_PER_GAME,
): PictureRound[] {
  const targets = pictureTargets(words, letters);
  return pickTargets(targets, count, rng).map(letter => {
    const starting = shuffle(
      words.filter(w => w.startsWith === letter.id),
      rng,
    );
    const answer = starting[0] as Word;
    const distractors = shuffle(
      words.filter(w => w.startsWith !== letter.id),
      rng,
    ).slice(0, PICTURE_CHOICES - 1);
    return { letter, answer, choices: shuffle([answer, ...distractors], rng) };
  });
}

/** Stars for a finished game: fewer wrong taps, more stars. Never 0 for finishing. */
export function gameStars(mistakes: number): 1 | 2 | 3 {
  if (mistakes <= 1) {
    return 3;
  }
  if (mistakes <= 4) {
    return 2;
  }
  return 1;
}
