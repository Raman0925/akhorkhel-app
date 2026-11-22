/**
 * Test-only fixture pack. Latin placeholders on purpose: tests must never carry invented language
 * content.
 */
import type { Letter, Pack, Word } from '@/content';

export function letter(id: string, glyph = id.toUpperCase()): Letter {
  return {
    id,
    glyph,
    group: 'consonant',
    order: 0,
    audio: `audio/letters/${id}.m4a`,
    key: `letter:${id}`,
    display: glyph,
    outline: '',
    strokes: [],
    strokeSource: 'auto',
  };
}

export function word(id: string, startsWith?: string, extra: Partial<Word> = {}): Word {
  return {
    id,
    text: id,
    audio: `audio/words/${id}.m4a`,
    image: `images/${id}.webp`,
    startsWith,
    placeholderEmoji: '🟢',
    ...extra,
  };
}

export function fixturePack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: 'tst-latn',
    language: { iso639_3: 'tst', nameNative: 'Test', nameEn: 'Test', nameAs: 'Test' },
    script: 'Latn',
    fontFamily: 'NotoSans-Regular',
    letters: ['a', 'b', 'c', 'd'].map(id => letter(id)),
    signs: [],
    words: [word('a1', 'a'), word('b1', 'b'), word('c1', 'c'), word('d1', 'd')],
    numbers: [],
    ...overrides,
  };
}
