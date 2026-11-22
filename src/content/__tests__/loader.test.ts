import { buildPack } from '@/content';
import type { GeometryFile, PackContent } from '@/content/schema';
import { PackContentSchema } from '@/content/schema';

const content: PackContent = {
  id: 'tst-latn',
  language: { iso639_3: 'tst', nameNative: 'Test', nameEn: 'Test', nameAs: 'টেষ্ট' },
  script: 'Latn',
  fontFamily: 'NotoSans-Regular',
  status: 'draft-needs-native-review',
  letters: [
    { id: 'b', glyph: 'b', group: 'consonant', order: 2, audio: 'audio/letters/b.m4a' },
    { id: 'a', glyph: 'a', group: 'vowel', order: 1, audio: 'audio/letters/a.m4a' },
  ],
  words: [],
  numbers: [{ value: 1, numeral: '1', word: 'one', audio: 'audio/numbers/1.m4a' }],
};

const geometry: GeometryFile = {
  'letter:a': {
    text: 'a',
    outline: 'M0 0L1 1Z',
    strokes: [
      {
        points: [
          [0, 0],
          [1, 1],
        ],
      },
    ],
    strokeSource: 'auto',
  },
};

describe('buildPack', () => {
  it('validates against the schema', () => {
    expect(PackContentSchema.safeParse(content).success).toBe(true);
  });

  it('sorts letters by order and merges geometry with keys', () => {
    const pack = buildPack(content, geometry);
    expect(pack.letters.map(l => l.key)).toEqual(['letter:a', 'letter:b']);
    expect(pack.letters[0]?.strokes).toHaveLength(1);
    expect(pack.letters[1]?.strokes).toEqual([]);
    expect(pack.numbers[0]?.key).toBe('number:1');
    expect(pack.signs).toEqual([]);
  });
});
