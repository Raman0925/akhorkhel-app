import { GeometryFileSchema } from '../../src/content/schema';
import {
  flattenPath,
  mergeStrokes,
  normalise,
  parsePathData,
  parseSvg,
  svgToStrokes,
} from '../svg-to-strokes';

describe('parsePathData', () => {
  it('tokenises commands, compact numbers and implicit repeats', () => {
    expect(parsePathData('M10,20L30-40.5.5 1Z')).toEqual([
      { cmd: 'M', args: [10, 20] },
      { cmd: 'L', args: [30, -40.5] },
      { cmd: 'L', args: [0.5, 1] },
      { cmd: 'Z', args: [] },
    ]);
  });

  it('expands extra pairs after M as L (and m as l)', () => {
    expect(parsePathData('M0 0 10 10 m 1 1 2 2')).toEqual([
      { cmd: 'M', args: [0, 0] },
      { cmd: 'L', args: [10, 10] },
      { cmd: 'm', args: [1, 1] },
      { cmd: 'l', args: [2, 2] },
    ]);
  });

  it('reads exponents', () => {
    expect(parsePathData('M1e1 2E-1')).toEqual([{ cmd: 'M', args: [10, 0.2] }]);
  });

  it('rejects unsupported or malformed data', () => {
    expect(() => parsePathData('M0 0 A 1 1 0 0 1 2 2')).toThrow(/Unsupported/);
    expect(() => parsePathData('10 10')).toThrow(/start with a command/);
    expect(() => parsePathData('M0')).toThrow(/needs 2 numbers/);
    expect(() => parsePathData('M0 0Z 5')).toThrow(/after Z/);
  });
});

describe('flattenPath', () => {
  it('handles absolute and relative lines, H and V', () => {
    expect(flattenPath('M0 0 L10 0 V10 H0 Z')).toEqual([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    expect(flattenPath('m5 5 l5 0 v5 h-5 z')).toEqual([
      [
        [5, 5],
        [10, 5],
        [10, 10],
        [5, 10],
        [5, 5],
      ],
    ]);
  });

  it('splits subpaths into separate polylines', () => {
    const lines = flattenPath('M0 0 L1 0 M5 5 L6 6');
    expect(lines).toHaveLength(2);
    expect(lines[1]?.[0]).toEqual([5, 5]);
  });

  it('flattens cubic curves through their end points', () => {
    const [line] = flattenPath('M0 0 C0 10 10 10 10 0', 8);
    expect(line).toHaveLength(9);
    expect(line?.[8]).toEqual([10, 0]);
    expect(line?.[4]?.[0]).toBeCloseTo(5);
    expect(line?.[4]?.[1]).toBeCloseTo(7.5);
  });

  it('reflects control points for S and T, and supports relative curves', () => {
    const [s] = flattenPath('M0 0 C0 10 10 10 10 0 S20 -10 20 0', 4);
    expect(s?.[s.length - 1]).toEqual([20, 0]);
    // Midpoint of the S segment is below the axis (reflected control point).
    expect(s?.[6]?.[1]).toBeLessThan(0);
    const [t] = flattenPath('M0 0 Q5 10 10 0 T20 0', 4);
    expect(t?.[t.length - 1]).toEqual([20, 0]);
    expect(t?.[6]?.[1]).toBeLessThan(0);
    const [r] = flattenPath('M0 0 c0 10 10 10 10 0 q5 10 10 0', 2);
    expect(r?.[r.length - 1]).toEqual([20, 0]);
    // S / T without a previous curve use the current point as the control point.
    const [plain] = flattenPath('M0 0 S10 10 10 0 M0 0 T10 0', 2);
    expect(plain?.[plain.length - 1]).toEqual([10, 0]);
  });
});

describe('parseSvg / normalise', () => {
  it('reads the viewBox and paths in order', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M10 50 L90 50" stroke="black"/>
      <path id="b" d='M50 10 L50 90'/>
      <path d=""/>
    </svg>`;
    const { viewBox, paths } = parseSvg(svg);
    expect(viewBox).toEqual({ minX: 0, minY: 0, width: 100, height: 100 });
    expect(paths).toEqual(['M10 50 L90 50', 'M50 10 L50 90']);
  });

  it('falls back to width/height and rejects SVGs without a size', () => {
    expect(parseSvg('<svg width="200" height="100"></svg>').viewBox).toEqual({
      minX: 0,
      minY: 0,
      width: 200,
      height: 100,
    });
    expect(() => parseSvg('<svg></svg>')).toThrow(/viewBox/);
    expect(() => parseSvg('<svg viewBox="0 0 0 10"></svg>')).toThrow(/viewBox/);
    expect(() => parseSvg('<div/>')).toThrow(/No <svg>/);
  });

  it('scales uniformly and centres the shorter side', () => {
    const vb = { minX: 0, minY: 0, width: 200, height: 100 };
    expect(normalise([0, 0], vb)).toEqual([0, 0.25]);
    expect(normalise([200, 100], vb)).toEqual([1, 0.75]);
    expect(normalise([15, 25], { minX: 10, minY: 20, width: 10, height: 10 })).toEqual([0.5, 0.5]);
  });
});

describe('svgToStrokes / mergeStrokes', () => {
  const svg = `<svg viewBox="0 0 100 100">
    <path d="M20 50 L50 50 L80 50"/>
    <path d="M50 20 C50 40 50 60 50 80"/>
  </svg>`;

  it('produces simplified, normalised strokes in writing order', () => {
    const strokes = svgToStrokes(svg);
    expect(strokes).toEqual([
      {
        points: [
          [0.2, 0.5],
          [0.8, 0.5],
        ],
      },
      {
        points: [
          [0.5, 0.2],
          [0.5, 0.8],
        ],
      },
    ]);
  });

  it('fails clearly when there are no strokes', () => {
    expect(() => svgToStrokes('<svg viewBox="0 0 10 10"></svg>')).toThrow(/No strokes/);
  });

  it('merges into an existing geometry entry as recorded', () => {
    const geometry = {
      'letter:x': { text: 'x', outline: 'M0 0L1 1Z', strokes: [], strokeSource: 'auto' },
    };
    const merged = mergeStrokes(geometry, 'letter:x', svgToStrokes(svg));
    expect(merged['letter:x']?.strokeSource).toBe('recorded');
    expect(merged['letter:x']?.outline).toBe('M0 0L1 1Z');
    expect(GeometryFileSchema.safeParse(merged).success).toBe(true);
    expect(geometry['letter:x'].strokes).toEqual([]);
    expect(() => mergeStrokes(geometry, 'letter:y', [])).toThrow(/No geometry entry/);
  });
});
