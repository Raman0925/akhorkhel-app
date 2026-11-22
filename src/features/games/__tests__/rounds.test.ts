import {
  canPlayHear,
  canPlayPicture,
  gameStars,
  hearChoiceCount,
  makeHearRounds,
  makePictureRounds,
  pickTargets,
  pictureWords,
  seededRng,
  shuffle,
} from '../logic/rounds';

import { letter, word } from '../__fixtures__/pack';

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(id => letter(id));

describe('shuffle and pickTargets', () => {
  it('is deterministic for a seed and keeps every item', () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(7));
    const b = shuffle([1, 2, 3, 4, 5], seededRng(7));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not repeat until the pool is used up, and never twice in a row', () => {
    for (let seed = 1; seed < 50; seed++) {
      const picks = pickTargets(['x', 'y', 'z'], 10, seededRng(seed));
      expect(picks).toHaveLength(10);
      expect(new Set(picks.slice(0, 3)).size).toBe(3);
      for (let i = 1; i < picks.length; i++) {
        expect(picks[i]).not.toBe(picks[i - 1]);
      }
    }
  });

  it('returns nothing for an empty pool', () => {
    expect(pickTargets([], 5, seededRng(1))).toEqual([]);
  });
});

describe('hear rounds', () => {
  it('uses fewer choices for small packs', () => {
    expect(hearChoiceCount(2)).toBe(2);
    expect(hearChoiceCount(5)).toBe(3);
    expect(hearChoiceCount(20)).toBe(4);
  });

  it('needs at least two different glyphs', () => {
    expect(canPlayHear([letter('a')])).toBe(false);
    expect(canPlayHear([letter('a', 'X'), letter('b', 'X')])).toBe(false);
    expect(canPlayHear([letter('a'), letter('b')])).toBe(true);
    expect(makeHearRounds([letter('a')], seededRng(1))).toEqual([]);
  });

  it('makes 5 rounds with distinct targets and distinct choices that include the target', () => {
    for (let seed = 1; seed < 30; seed++) {
      const rounds = makeHearRounds(letters, seededRng(seed));
      expect(rounds).toHaveLength(5);
      expect(new Set(rounds.map(r => r.target.id)).size).toBe(5);
      for (const r of rounds) {
        const ids = r.choices.map(c => c.id);
        expect(ids).toHaveLength(4);
        expect(new Set(ids).size).toBe(4);
        expect(ids).toContain(r.target.id);
      }
    }
  });

  it('is deterministic for a seed', () => {
    expect(makeHearRounds(letters, seededRng(3))).toEqual(makeHearRounds(letters, seededRng(3)));
  });
});

describe('picture rounds', () => {
  const four = ['a', 'b', 'c', 'd'].map(id => letter(id));
  const words = [word('a1', 'a'), word('a2', 'a'), word('b1', 'b'), word('c1', 'c')];

  it('only uses non-bonus words with a picture and a known first letter', () => {
    const all = [
      ...words,
      word('x1', 'x'),
      word('n1', undefined),
      word('bonus', 'a', { bonus: true }),
      word('nopic', 'b', { placeholderEmoji: undefined }),
    ];
    const usable = pictureWords(all, four, w => w.placeholderEmoji !== undefined);
    expect(usable.map(w => w.id)).toEqual(['a1', 'a2', 'b1', 'c1']);
  });

  it('needs a letter with a word plus two words starting differently', () => {
    expect(canPlayPicture([word('a1', 'a'), word('a2', 'a')], four)).toBe(false);
    expect(canPlayPicture([word('a1', 'a'), word('b1', 'b')], four)).toBe(false);
    expect(canPlayPicture([word('a1', 'a'), word('a2', 'a'), word('b1', 'b')], four)).toBe(true);
  });

  it('each round has one answer starting with the letter and distractors that do not', () => {
    for (let seed = 1; seed < 30; seed++) {
      const rounds = makePictureRounds(words, four, seededRng(seed));
      expect(rounds).toHaveLength(5);
      for (let i = 0; i < rounds.length; i++) {
        const r = rounds[i]!;
        expect(r.answer.startsWith).toBe(r.letter.id);
        expect(r.choices).toHaveLength(3);
        expect(new Set(r.choices.map(c => c.id)).size).toBe(3);
        expect(r.choices.filter(c => c.startsWith === r.letter.id)).toEqual([r.answer]);
        if (i > 0) {
          expect(r.letter.id).not.toBe(rounds[i - 1]!.letter.id);
        }
      }
    }
  });
});

it('gives stars for finishing, more for fewer mistakes', () => {
  expect(gameStars(0)).toBe(3);
  expect(gameStars(1)).toBe(3);
  expect(gameStars(3)).toBe(2);
  expect(gameStars(9)).toBe(1);
});
