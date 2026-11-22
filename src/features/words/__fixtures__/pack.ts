/** Test-only fixture pack. Latin placeholders on purpose: tests never carry invented language content. */
import type { Pack, Word } from '@/content';

export function word(id: string, extra: Partial<Word> = {}): Word {
  return {
    id,
    text: id,
    audio: `audio/words/${id}.m4a`,
    image: `images/${id}.webp`,
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
    status: 'draft-needs-native-review',
    letters: [],
    signs: [],
    words: [
      word('one'),
      word('two', { bridge: { as: 'bridge-as', en: 'bridge-en' }, placeholderEmoji: undefined }),
      word('extra', { bonus: true }),
    ],
    numbers: [],
    ...overrides,
  };
}
