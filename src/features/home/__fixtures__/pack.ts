/** Test-only fixture pack. Latin placeholders on purpose: tests never carry invented content. */
import type { Letter, NumberItem, Pack, Sign, Word } from '@/content';

const geometry = { outline: '', strokes: [], strokeSource: 'auto' as const };

export function letter(id: string): Letter {
  const glyph = id.toUpperCase();
  return {
    id,
    glyph,
    group: 'vowel',
    order: 0,
    audio: `audio/${id}.m4a`,
    key: `letter:${id}`,
    display: glyph,
    ...geometry,
  };
}

export const sign: Sign = {
  id: 'ka',
  base: 'K',
  sign: 'a',
  result: 'Ka',
  audio: 'audio/ka.m4a',
  key: 'sign:ka',
  display: 'Ka',
  ...geometry,
};

export function word(id: string): Word {
  return { id, text: id, audio: `audio/${id}.m4a`, image: `images/${id}.webp` };
}

export const one: NumberItem = {
  value: 1,
  numeral: 'n1',
  audio: 'audio/1.m4a',
  key: 'number:1',
  display: 'n1',
  ...geometry,
};

export function fixturePack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: 'tst-latn',
    language: { iso639_3: 'tst', nameNative: 'Native', nameEn: 'Testish', nameAs: 'Test-as' },
    script: 'Latn',
    fontFamily: 'NotoSans-Regular',
    status: 'draft-needs-native-review',
    letters: [letter('a'), letter('b')],
    signs: [sign],
    words: [word('w1')],
    numbers: [one],
    ...overrides,
  };
}
