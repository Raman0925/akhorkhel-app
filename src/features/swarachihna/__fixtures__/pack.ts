/** Test-only fixture pack. Latin placeholders on purpose: tests never carry invented content. */
import type { Pack, Sign } from '@/content';

export function sign(id: string, base: string, mark: string): Sign {
  return {
    id,
    base,
    sign: mark,
    result: base + mark,
    audio: `audio/signs/${id}.m4a`,
    key: `sign:${id}`,
    display: base + mark,
    outline: '',
    strokes: [],
    strokeSource: 'auto',
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
    signs: [sign('ka', 'K', 'a'), sign('ki', 'K', 'i')],
    words: [],
    numbers: [],
    ...overrides,
  };
}
