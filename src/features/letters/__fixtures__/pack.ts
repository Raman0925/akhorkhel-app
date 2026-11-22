/** Test-only fixture pack. Latin placeholders on purpose: tests never carry invented content. */
import type { Letter, Pack, Word } from '@/content';

export function letter(id: string, group: Letter['group'], extra: Partial<Letter> = {}): Letter {
  const glyph = id.toUpperCase();
  return {
    id,
    glyph,
    group,
    order: 0,
    audio: `audio/letters/${id}.m4a`,
    key: `letter:${id}`,
    display: glyph,
    outline: '',
    strokes: [],
    strokeSource: 'auto',
    ...extra,
  };
}

export const fixtureWord: Word = {
  id: 'apple',
  text: 'apple',
  audio: 'audio/words/apple.m4a',
  image: 'images/apple.webp',
  startsWith: 'a',
  placeholderEmoji: '🍎',
};

export function fixturePack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: 'tst-latn',
    language: { iso639_3: 'tst', nameNative: 'Test', nameEn: 'Test', nameAs: 'Test' },
    script: 'Latn',
    fontFamily: 'NotoSans-Regular',
    status: 'draft-needs-native-review',
    letters: [
      letter('a', 'vowel', { exampleWordId: 'apple' }),
      letter('e', 'vowel'),
      letter('b', 'consonant'),
      letter('c', 'consonant'),
      letter('d', 'consonant'),
      letter('f', 'consonant'),
    ],
    signs: [],
    words: [fixtureWord],
    numbers: [],
    ...overrides,
  };
}
