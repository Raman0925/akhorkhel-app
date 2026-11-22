/**
 * The scorer on real generated geometry (src/content/packs/<id>/geometry.json): a child who traces
 * exactly along the reference strokes, in order, earns 3 stars at every level.
 */
import asmBengGeometry from '../../../../content/packs/asm-beng/geometry.json';
import brxDevaGeometry from '../../../../content/packs/brx-deva/geometry.json';
import type { GeometryFile } from '../../../../content/schema';
import { resample, pathLength, type Vec } from '../geometry';
import { scoreGlyph, scoreStroke } from '../score';

const PACKS: Record<string, GeometryFile> = {
  'asm-beng': asmBengGeometry as unknown as GeometryFile,
  'brx-deva': brxDevaGeometry as unknown as GeometryFile,
};

const CASES: [string, string][] = [
  ['asm-beng', 'letter:ka'], // headline, stem with bowl
  ['asm-beng', 'letter:aa'], // headline, two stems
  ['asm-beng', 'letter:rha'], // nukta dot
  ['asm-beng', 'sign:ka-i'], // vowel sign with a loop above the headline
  ['asm-beng', 'number:12'], // two digits, no headline
  ['brx-deva', 'letter:a'],
  ['brx-deva', 'letter:o-candra'], // candrabindu above the headline
  ['brx-deva', 'letter:rra'], // nukta dot
  ['brx-deva', 'number:14'],
];

/**
 * Every human-aligned entry (strokes reordered/reversed/merged to match a school primer, or
 * recorded by a native writer) must stay traceable too.
 */
const HUMAN: [string, string][] = Object.entries(PACKS).flatMap(([pack, geo]) =>
  Object.entries(geo)
    .filter(
      ([key, e]) => e.strokeSource !== 'auto' && !CASES.some(c => c[0] === pack && c[1] === key),
    )
    .map(([key]): [string, string] => [pack, key]),
);

it('has human-aligned entries to check', () => {
  expect(HUMAN.length).toBeGreaterThan(0);
});

/** What the finger sends: many points along the stroke, a few pixels apart. */
const trace = (stroke: readonly Vec[]): Vec[] =>
  resample(stroke, Math.max(8, Math.ceil(pathLength(stroke) / 0.01)));

describe.each([...CASES, ...HUMAN])('tracing %s %s exactly along its strokes', (pack, key) => {
  const entry = (PACKS[pack] as GeometryFile)[key];
  const refs = (entry?.strokes ?? []).map(s => s.points as Vec[]);
  const drawn = refs.map(trace);

  it('has strokes', () => {
    expect(refs.length).toBeGreaterThan(0);
  });

  it.each([1, 2] as const)('accepts every stroke in order at level %i', level => {
    drawn.forEach((d, i) => {
      const s = scoreStroke(d, refs, i, level);
      expect({ i, good: s.good, hint: s.hint }).toEqual({ i, good: true, hint: 'none' });
    });
  });

  it.each([1, 2, 3] as const)('earns 3 stars at level %i', level => {
    const score = scoreGlyph(drawn, refs, level);
    expect(score.good).toBe(true);
    expect(score.stars).toBe(3);
  });
});
