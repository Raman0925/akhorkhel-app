import type { GeometryFile, PackContent } from '../../src/content/schema';
import { outlineProblems, registeredPackIds, validatePack } from '../validate-packs';

const stroke = {
  points: [
    [0.2, 0.2],
    [0.8, 0.8],
  ] as [number, number][],
};

function fixture(): { pack: PackContent; geometry: GeometryFile } {
  return {
    pack: {
      id: 'tst-beng',
      language: { iso639_3: 'tst', nameNative: 'টেষ্ট', nameEn: 'Test', nameAs: 'টেষ্ট' },
      script: 'Beng',
      fontFamily: 'NotoSansBengali-Regular',
      sources: ['test fixture'],
      letters: [
        { id: 'ka', glyph: 'ক', group: 'consonant', order: 1, audio: 'audio/letters/ka.m4a' },
      ],
      signs: [{ id: 'ka-i', base: 'ক', sign: 'ি', result: 'কি', audio: 'audio/signs/ka-i.m4a' }],
      words: [],
      numbers: [{ value: 1, numeral: '১', audio: 'audio/numbers/1.m4a' }],
    },
    geometry: {
      'letter:ka': {
        text: 'ক',
        outline: 'M0.1 0.1L0.9 0.9Z',
        strokes: [stroke],
        strokeSource: 'auto',
      },
      'sign:ka-i': {
        text: 'কি',
        outline: 'M0.1 0.1L0.9 0.9Z',
        strokes: [stroke],
        strokeSource: 'auto',
      },
      'number:1': {
        text: '১',
        outline: 'M0.1 0.1L0.9 0.9Z',
        strokes: [stroke],
        strokeSource: 'auto',
      },
    },
  };
}

const none = () => false;
const all = () => true;

describe('validatePack', () => {
  it('accepts a complete pack; missing files are only warnings', () => {
    const { pack, geometry } = fixture();
    const r = validatePack(pack, geometry, none, { release: false });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(/3 audio\/image files not added yet/);
  });

  it('reports schema errors', () => {
    const { pack, geometry } = fixture();
    const r = validatePack({ ...pack, id: 'BAD' }, geometry, all, { release: false });
    expect(r.errors[0]).toMatch(/^schema: id/);
  });

  it('requires geometry with matching text, an outline and strokes', () => {
    const { pack, geometry } = fixture();
    delete geometry['number:1'];
    (geometry['letter:ka'] as { text: string }).text = 'খ';
    (geometry['sign:ka-i'] as { strokes: unknown[] }).strokes = [];
    const errors = validatePack(pack, geometry, all, { release: false }).errors.join('\n');
    expect(errors).toMatch(/number:1: no geometry/);
    expect(errors).toMatch(/letter:ka: geometry is for "খ"/);
    expect(errors).toMatch(/sign:ka-i: no strokes/);
  });

  it('rejects broken outlines and zero-length strokes', () => {
    const { pack, geometry } = fixture();
    (geometry['letter:ka'] as { outline: string }).outline = 'M0 0 X';
    (geometry['number:1'] as { outline: string }).outline = 'M0 0L1.5 1Z';
    (geometry['sign:ka-i'] as { strokes: unknown[] }).strokes = [
      {
        points: [
          [0.5, 0.5],
          [0.5, 0.5],
        ],
      },
    ];
    const errors = validatePack(pack, geometry, all, { release: false }).errors.join('\n');
    expect(errors).toMatch(/letter:ka: outline does not parse/);
    expect(errors).toMatch(/number:1: outline leaves the unit box/);
    expect(errors).toMatch(/sign:ka-i: stroke 1 has zero length/);
  });

  it('rejects non-NFC text, duplicates and a sign whose result is not base + sign', () => {
    const { pack, geometry } = fixture();
    pack.letters.push({
      id: 'ka',
      // U+09DC is a composition exclusion: its NFC form is ড + ় (U+09A1 U+09BC)
      glyph: 'ড়',
      group: 'consonant',
      order: 1,
      audio: 'audio/letters/x.m4a',
    });
    (pack.signs ?? [])[0]!.result = 'কা';
    (geometry['sign:ka-i'] as { text: string }).text = 'কা';
    const errors = validatePack(pack, geometry, all, { release: false }).errors.join('\n');
    expect(errors).toMatch(/duplicate letter id: ka/);
    expect(errors).toMatch(/duplicate letter order id: 1/);
    expect(errors).toMatch(/not NFC/);
    expect(errors).toMatch(/sign ka-i: result "কা" is not base \+ sign/);
  });

  it('checks references between words and letters', () => {
    const { pack, geometry } = fixture();
    pack.letters[0]!.exampleWordId = 'nope';
    pack.words.push({
      id: 'w',
      text: 'কল',
      audio: 'audio/words/w.m4a',
      image: 'images/words/w.webp',
      startsWith: 'zz',
    });
    const errors = validatePack(pack, geometry, all, { release: false }).errors.join('\n');
    expect(errors).toMatch(/exampleWordId nope does not exist/);
    expect(errors).toMatch(/startsWith zz does not exist/);
  });

  it('release mode rejects placeholder emoji (allowed outside release)', () => {
    const { pack, geometry } = fixture();
    pack.words.push({
      id: 'w',
      text: 'কল',
      audio: 'audio/words/w.m4a',
      image: 'images/words/w.webp',
      placeholderEmoji: '🍌',
    });
    expect(validatePack(pack, geometry, all, { release: false }).errors).toEqual([]);
    expect(validatePack(pack, geometry, all, { release: true }).errors).toEqual([
      'word w: placeholderEmoji is not allowed in a release',
    ]);
  });

  it('release mode still runs the integrity checks', () => {
    const { pack, geometry } = fixture();
    delete geometry['number:1'];
    const errors = validatePack(pack, geometry, all, { release: true }).errors.join('\n');
    expect(errors).toMatch(/number:1: no geometry/);
  });

  it('passes the release gate without audio, images, number words, review or recorded strokes', () => {
    // ADR 0004: these are optional at launch and only produce warnings.
    const { pack, geometry } = fixture();
    const r = validatePack(pack, geometry, none, { release: true });
    expect(r.errors).toEqual([]);
    const warnings = r.warnings.join('\n');
    expect(warnings).toMatch(/3 audio\/image files not added yet/);
    expect(warnings).toMatch(/1 numbers have no number word/);
    expect(warnings).toMatch(/3 items use auto-generated strokes/);
  });

  it('ignores the removed review fields in old pack files', () => {
    const { pack, geometry } = fixture();
    const old = { ...pack, status: 'draft-needs-native-review', reviewedBy: [] };
    expect(validatePack(old, geometry, all, { release: true }).errors).toEqual([]);
  });

  it('warns about an empty pack without sources', () => {
    const { pack } = fixture();
    const r = validatePack(
      { ...pack, letters: [], signs: [], numbers: [], sources: undefined },
      {},
      all,
      { release: false },
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual(
      expect.arrayContaining([
        'pack has no letters yet',
        'pack has no sources: record where the inventory came from',
      ]),
    );
  });
});

describe('outlineProblems', () => {
  it('accepts unit-box paths and rejects empty ones', () => {
    expect(outlineProblems('M0 0L1 1Q0.5 0.5 0 1Z')).toEqual([]);
    expect(outlineProblems('Z')).toEqual(['has no drawing commands']);
  });
});

describe('registeredPackIds', () => {
  it('reads pack imports from the registry source', () => {
    const src =
      "import a from './asm-beng/pack.json';\nimport g from './asm-beng/geometry.json';\nimport b from './brx-deva/pack.json';";
    expect(registeredPackIds(src)).toEqual(['asm-beng', 'brx-deva']);
  });
});
