/** Test-only fixture pack. Placeholder numerals on purpose: tests never carry invented content. */
import type { NumberItem, Pack } from '@/content';

export function num(value: number, extra: Partial<NumberItem> = {}): NumberItem {
  return {
    value,
    numeral: `n${value}`,
    audio: `audio/numbers/${value}.m4a`,
    key: `number:${value}`,
    display: `n${value}`,
    outline: '',
    strokes: [],
    strokeSource: 'auto',
    ...extra,
  };
}

export function fixturePack(overrides: Partial<Pack> = {}): Pack {
  return {
    id: 'tst-latn',
    language: { iso639_3: 'tst', nameNative: 'Test', nameEn: 'Test', nameAs: 'Test' },
    script: 'Latn',
    fontFamily: 'NotoSans-Regular',
    status: 'draft-needs-native-review',
    letters: [],
    signs: [],
    words: [],
    numbers: [num(1), num(2), num(3, { word: 'three-word' }), num(30)],
    ...overrides,
  };
}
