/**
 * A tiny made-up test pack (NOT language content): one letter with geometry ("plus" shape), one
 * letter without geometry, one number. Real packs are filled by A3 from human-reviewed sources.
 */
import { buildPack } from '@/content/loader';
import type { GeometryFile, Pack, PackContent } from '@/content/schema';

const line = (from: [number, number], to: [number, number], n = 12): [number, number][] =>
  Array.from({ length: n }, (_, i) => [
    from[0] + ((to[0] - from[0]) * i) / (n - 1),
    from[1] + ((to[1] - from[1]) * i) / (n - 1),
  ]);

export const PLUS_STROKES = [line([0.2, 0.5], [0.8, 0.5]), line([0.5, 0.2], [0.5, 0.8])];

const content: PackContent = {
  id: 'tst-latn',
  language: { iso639_3: 'tst', nameNative: 'Test', nameEn: 'Test', nameAs: 'Test' },
  script: 'Latn',
  fontFamily: 'NotoSans-Regular',
  status: 'draft-needs-native-review',
  letters: [
    { id: 'plus', glyph: '+', group: 'other', order: 0, audio: 'audio/plus.m4a' },
    { id: 'empty', glyph: '?', group: 'other', order: 1, audio: 'audio/empty.m4a' },
  ],
  signs: [],
  words: [],
  numbers: [{ value: 1, numeral: '1', audio: 'audio/1.m4a' }],
};

const geometry: GeometryFile = {
  'letter:plus': {
    text: '+',
    outline: 'M0.45 0.2H0.55V0.45H0.8V0.55H0.55V0.8H0.45V0.55H0.2V0.45H0.45Z',
    strokes: PLUS_STROKES.map(points => ({ points })),
    strokeSource: 'recorded',
  },
  'number:1': {
    text: '1',
    outline: 'M0.45 0.2H0.55V0.8H0.45Z',
    strokes: [{ points: line([0.5, 0.2], [0.5, 0.8]) }],
    strokeSource: 'recorded',
  },
};

export const FIXTURE_PACK: Pack = buildPack(content, geometry);
