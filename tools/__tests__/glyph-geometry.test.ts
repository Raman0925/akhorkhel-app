import type { GeometryFile, GlyphGeometry } from '../../src/content/schema';
import {
  type Branch,
  type Pt,
  contractShortLinks,
  dropParallel,
  dropSpurs,
  dropTiny,
  extractHeadline,
  findHeadlineBand,
  fitToUnitBox,
  formatOutline,
  isHeadline,
  isStem,
  joinGaps,
  joinLoops,
  labelComponents,
  mergeContinuations,
  mergeDegreeTwo,
  mergeGeometry,
  mergeHeadPieces,
  orderStrokes,
  orientStroke,
  parseOutline,
  polylineDistance,
  pruneSpurs,
  rasterize,
  rdp,
  stableGeometryJson,
  strokesFromOutline,
  strokeWidth,
  traceSkeleton,
  zhangSuen,
} from '../glyph-geometry';

const count = (g: Uint8Array) => g.reduce((s, v) => s + v, 0);

/** Grid from ASCII art: '#' = 1. */
function grid(rows: string[]): { g: Uint8Array; w: number; h: number } {
  const h = rows.length;
  const w = (rows[0] as string).length;
  const g = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((c, x) => (g[y * w + x] = c === '#' ? 1 : 0)));
  return { g, w, h };
}

function fillRect(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const g = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      g[y * w + x] = 1;
    }
  }
  return g;
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const line = (a: Pt, b: Pt, n = 10): Pt[] =>
  Array.from(
    { length: n + 1 },
    (_, i) => [r6(a[0] + ((b[0] - a[0]) * i) / n), r6(a[1] + ((b[1] - a[1]) * i) / n)] as Pt,
  );

describe('outline paths', () => {
  it('parses and formats absolute commands', () => {
    const cmds = parseOutline('M0 0L1 0Q1 1 0.5 1C0.2 1 0 0.5 0 0Z');
    expect(cmds.map(c => c.type)).toEqual(['M', 'L', 'Q', 'C', 'Z']);
    expect(formatOutline(cmds)).toBe('M0 0L1 0Q1 1 0.5 1C0.2 1 0 0.5 0 0Z');
  });

  it('converts H/V to L and supports implicit lineto', () => {
    expect(formatOutline(parseOutline('M0.1 0.1 0.9 0.1 V0.9 H0.1Z'))).toBe(
      'M0.1 0.1L0.9 0.1L0.9 0.9L0.1 0.9Z',
    );
  });

  it('rejects relative or unknown commands and junk', () => {
    expect(() => parseOutline('m0 0l1 1')).toThrow(/unsupported/);
    expect(() => parseOutline('M0 0L1')).toThrow(/needs 2/);
    expect(() => parseOutline('M0 0 L1 1 %')).toThrow(/unexpected/);
  });

  it('fits a font-unit path into the unit box with a 10% margin, y flipped', () => {
    const fitted = fitToUnitBox(parseOutline('M0 0L200 0L200 100L0 100Z'));
    expect(formatOutline(fitted)).toBe('M0.1 0.7L0.9 0.7L0.9 0.3L0.1 0.3Z');
  });
});

describe('rasterize', () => {
  it('fills pixels whose centres are inside', () => {
    const g = rasterize(
      [
        [
          [2, 2],
          [8, 2],
          [8, 8],
          [2, 8],
        ],
      ],
      10,
      10,
    );
    expect(count(g)).toBe(36);
    expect(g[2 * 10 + 2]).toBe(1);
    expect(g[8 * 10 + 8]).toBe(0);
  });

  it('uses the non-zero rule: a reversed inner contour is a hole', () => {
    const outer: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const hole: Pt[] = [
      [3, 3],
      [3, 7],
      [7, 7],
      [7, 3],
    ];
    expect(count(rasterize([outer, hole], 10, 10))).toBe(100 - 16);
    // same direction: still filled
    expect(count(rasterize([outer, [...hole].reverse()], 10, 10))).toBe(100);
  });
});

describe('zhangSuen', () => {
  it('thins a thick bar to a one-pixel line', () => {
    const w = 30;
    const h = 11;
    const sk = zhangSuen(fillRect(w, h, 2, 3, 28, 8), w, h);
    for (let x = 0; x < w; x++) {
      let col = 0;
      for (let y = 0; y < h; y++) {
        col += sk[y * w + x] as number;
      }
      expect(col).toBeLessThanOrEqual(1);
    }
    expect(count(sk)).toBeGreaterThan(15);
  });

  it('keeps a tiny dot instead of erasing it', () => {
    const w = 6;
    const h = 6;
    expect(count(zhangSuen(fillRect(w, h, 2, 2, 4, 4), w, h))).toBeGreaterThan(0);
  });

  it('does not modify its input', () => {
    const input = fillRect(10, 10, 1, 1, 9, 9);
    zhangSuen(input, 10, 10);
    expect(count(input)).toBe(64);
  });
});

describe('traceSkeleton', () => {
  it('splits a T at its junction', () => {
    const { g, w, h } = grid([
      '...........',
      '.#########.',
      '.....#.....',
      '.....#.....',
      '.....#.....',
      '.....#.....',
      '...........',
    ]);
    const branches = traceSkeleton(g, w, h);
    expect(branches).toHaveLength(3);
    const b0 = branches[0] as Branch;
    const shared = [b0.a, b0.b].filter(n => branches.every(b => b.a === n || b.b === n));
    expect(shared).toHaveLength(1);
  });

  it('traces a ring as one closed branch', () => {
    const { g, w, h } = grid(['.....', '.###.', '.#.#.', '.###.', '.....']);
    const branches = traceSkeleton(g, w, h);
    expect(branches).toHaveLength(1);
    const b = branches[0] as Branch;
    expect(b.a).toBe(b.b);
    expect(b.pts[0]).toEqual(b.pts[b.pts.length - 1]);
  });

  it('turns isolated pixels and two-pixel dots into single points', () => {
    const { g, w, h } = grid(['#....', '.....', '...#.', '....#']);
    const branches = traceSkeleton(g, w, h);
    expect(branches).toHaveLength(2);
    expect(branches.every(b => b.pts.length === 1)).toBe(true);
  });
});

describe('branch clean-up', () => {
  // junction node 0 at (10,10)
  const left: Branch = { pts: line([0, 10], [10, 10]), a: 1, b: 0 };
  const right: Branch = { pts: line([10, 10], [20, 10]), a: 0, b: 2 };
  const up: Branch = { pts: line([10, 10], [10, 0]), a: 0, b: 3 };
  const down: Branch = { pts: line([10, 10], [10, 20]), a: 0, b: 4 };
  const spur: Branch = { pts: line([10, 10], [12, 12], 2), a: 0, b: 5 };

  it('merges through degree-two nodes', () => {
    const merged = mergeDegreeTwo([left, right]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.pts[0]).toEqual([0, 10]);
    expect(merged[0]?.pts[merged[0].pts.length - 1]).toEqual([20, 10]);
  });

  it('prunes short spurs at junctions and re-merges', () => {
    const out = pruneSpurs([left, right, spur], 5);
    expect(out).toHaveLength(1);
    expect(out[0]?.pts).toHaveLength(21);
  });

  it('keeps long branches', () => {
    expect(pruneSpurs([left, right, up], 5)).toHaveLength(3);
  });

  it('joins straight continuations at a crossing', () => {
    const out = mergeDegreeTwo(mergeContinuations([left, right, up, down]));
    expect(out).toHaveLength(2);
    const lens = out.map(b => b.pts.length).sort();
    expect(lens).toEqual([21, 21]);
  });

  it('contracts short links between junctions and drops tiny holes', () => {
    const a: Branch = { pts: line([0, 0], [10, 0]), a: 1, b: 10 };
    const b: Branch = { pts: line([10, 10], [0, 10]), a: 10, b: 2 };
    const link: Branch = { pts: line([10, 0], [10, 2], 2), a: 10, b: 11 };
    const c: Branch = { pts: line([10, 2], [20, 2]), a: 11, b: 3 };
    const d: Branch = { pts: line([10, 2], [10, 20]), a: 11, b: 4 };
    const hole: Branch = {
      pts: [
        [10, 2],
        [11, 3],
        [10, 3],
        [10, 2],
      ],
      a: 11,
      b: 11,
    };
    const out = contractShortLinks([a, b, link, c, d, hole], 5);
    expect(out).toHaveLength(4);
    expect(out.every(x => x.a === 10 || x.b === 10)).toBe(true);
  });

  it('joins tiny gaps between free ends', () => {
    const p: Branch = { pts: line([0, 0], [10, 0]), a: 1, b: 2 };
    const q: Branch = { pts: line([11, 0], [20, 0]), a: 3, b: 4 };
    const out = joinGaps([p, q], 2);
    expect(out).toHaveLength(1);
    expect(joinGaps([p, q], 0.5)).toHaveLength(2);
  });

  it('drops tiny branches but keeps a lone dot', () => {
    const long: Branch = { pts: line([0, 0], [20, 0]), a: 1, b: 2 };
    const crumb: Branch = { pts: line([0, 5], [1, 5], 1), a: 2, b: 3 };
    const dot: Branch = { pts: [[30, 30]], a: 9, b: 9 };
    const out = dropTiny([long, crumb, dot], 5);
    expect(out).toContain(long);
    expect(out).toContain(dot);
    expect(out).not.toContain(crumb);
  });

  it('simplifies collinear points with RDP', () => {
    expect(rdp(line([0, 0], [10, 10]), 0.5)).toEqual([
      [0, 0],
      [10, 10],
    ]);
    const corner = [...line([0, 0], [10, 0]), ...line([10, 0], [10, 10]).slice(1)];
    expect(rdp(corner, 0.5)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
  });
});

describe('joining and dropping branches', () => {
  const left: Branch = { pts: line([0, 10], [10, 10]), a: 1, b: 0 };
  const right: Branch = { pts: line([10, 10], [20, 10]), a: 0, b: 2 };
  const down: Branch = { pts: line([10, 10], [10, 20]), a: 0, b: 4 };

  it('joins a degree-two node only when the branches continue smoothly', () => {
    expect(mergeContinuations([left, right], 50, 10, 2)).toHaveLength(1);
    expect(mergeContinuations([left, down], 50, 10, 2)).toHaveLength(2);
  });

  it('can leave chosen degree-two nodes unmerged', () => {
    expect(mergeDegreeTwo([left, down], new Set([0]))).toHaveLength(2);
    expect(mergeDegreeTwo([left, down])).toHaveLength(1);
  });

  it('joins gaps only between smooth continuations when asked', () => {
    const p: Branch = { pts: line([0, 0], [10, 0]), a: 1, b: 2 };
    const turn: Branch = { pts: line([11, 0], [11, 10]), a: 3, b: 4 };
    const straight: Branch = { pts: line([11, 0], [20, 0]), a: 3, b: 4 };
    expect(joinGaps([p, turn], 2, 60)).toHaveLength(2);
    expect(joinGaps([p, turn], 2)).toHaveLength(1);
    expect(joinGaps([p, straight], 2, 60)).toHaveLength(1);
  });

  it('drops the shorter of two parallel branches (a tiny hole)', () => {
    const tail1: Branch = { pts: line([-10, 0], [0, 0]), a: 0, b: 1 };
    const flat: Branch = { pts: line([0, 0], [10, 0]), a: 1, b: 2 };
    const bump: Branch = {
      pts: [
        [0, 0],
        [5, 2],
        [10, 0],
      ],
      a: 2,
      b: 1,
    };
    const tail2: Branch = { pts: line([10, 0], [20, 0]), a: 2, b: 3 };
    const out = dropParallel([tail1, flat, bump, tail2], 15);
    expect(out).toHaveLength(1);
    expect(out[0]?.pts.some(([, y]) => y > 0)).toBe(true);
    expect(dropParallel([tail1, flat, bump, tail2], 5)).toHaveLength(4);
  });

  it('joins a stem with the loop it enters, continuing the smooth way round', () => {
    const stem: Branch = { pts: line([10, 0], [10, 10]), a: 5, b: 0 };
    const loop: Branch = {
      pts: [
        ...line([10, 10], [20, 10]),
        ...line([20, 10], [20, 20]).slice(1),
        ...line([20, 20], [10, 20]).slice(1),
        ...line([10, 20], [10, 10]).slice(1),
      ],
      a: 0,
      b: 0,
    };
    const out = joinLoops([stem, loop]);
    expect(out).toHaveLength(1);
    expect(out[0]?.pts[0]).toEqual([10, 0]);
    expect(out[0]?.pts[11]).toEqual([10, 11]); // straight on down, not a sharp turn right
  });

  it('drops short branches that touch other ink but keeps isolated dots', () => {
    const w = 20;
    const g = new Uint8Array(w * 10);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 16; x++) {
        g[y * w + x] = 1;
      }
    }
    g[8 * w + 18] = 1;
    const labels = labelComponents(g, w, 10);
    const bar: Branch = { pts: line([1.5, 1.5], [14.5, 1.5]), a: 1, b: 2 };
    const spur: Branch = { pts: line([5.5, 1.5], [5.5, 3.5], 2), a: 3, b: 4 };
    const dot: Branch = { pts: [[18.5, 8.5]], a: 5, b: 5 };
    const out = dropSpurs([bar, spur, dot], [], labels, w, 5);
    expect(out).toEqual([bar, dot]);
    // a short branch next to a headline (given as `others`) is a spur too
    expect(dropSpurs([spur], [line([1.5, 1.5], [14.5, 1.5])], labels, w, 5)).toEqual([]);
  });
});

describe('headline', () => {
  /** A 60x60 raster: a bar (rows 10..15) with a stem below its middle. */
  function tee(gap = false) {
    const w = 60;
    const g = new Uint8Array(w * w);
    for (let y = 10; y <= 15; y++) {
      for (let x = 5; x <= 55; x++) {
        if (!gap || x < 36 || x > 44) {
          g[y * w + x] = 1;
        }
      }
    }
    for (let y = 16; y <= 55; y++) {
      for (let x = 28; x <= 33; x++) {
        g[y * w + x] = 1;
      }
    }
    return { g, w };
  }

  it('finds the bar rows', () => {
    const { g, w } = tee();
    expect(findHeadlineBand(g, w, w)).toEqual({ y0: 10, y1: 15 });
    expect(findHeadlineBand(g, w, w, 0.3, 8)).toBeNull(); // thinner than the pen
  });

  it('does not take the top of a ring for a headline', () => {
    const ring = (r: number, dir: number): Pt[] =>
      Array.from({ length: 64 }, (_, i) => {
        const a = (dir * 2 * Math.PI * i) / 64;
        return [30 + r * Math.cos(a), 30 + r * Math.sin(a)] as Pt;
      });
    const g = rasterize([ring(25, 1), ring(18, -1)], 60, 60);
    expect(findHeadlineBand(g, 60, 60)).toBeNull();
  });

  it('measures the pen width', () => {
    const { g, w } = tee();
    expect(strokeWidth(g, zhangSuen(g, w, w), w, w)).toBeGreaterThanOrEqual(5);
    expect(strokeWidth(g, zhangSuen(g, w, w), w, w)).toBeLessThanOrEqual(7);
  });

  it('cuts the headline out of the skeleton and merges it into one bar', () => {
    const { g, w } = tee();
    const band = findHeadlineBand(g, w, w) as { y0: number; y1: number };
    const branches = pruneSpurs(traceSkeleton(zhangSuen(g, w, w), w, w), 4);
    const cut = extractHeadline(branches, band, 3, g, w);
    expect(cut.pieces.length).toBeGreaterThanOrEqual(2);
    expect(cut.rest).toHaveLength(1); // the stem
    const bars = mergeHeadPieces(cut.pieces, g, w, band, 5);
    expect(bars).toHaveLength(1);
    const [[x0, y0], [x1, y1]] = bars[0] as [Pt, Pt];
    expect(x0).toBeLessThanOrEqual(9);
    expect(x1).toBeGreaterThanOrEqual(52);
    expect(y0).toBe(y1);
    expect(Math.abs(y0 - 13)).toBeLessThanOrEqual(1.5);
  });

  it('keeps bars apart when no ink bridges them', () => {
    const { g, w } = tee(true);
    const band = findHeadlineBand(g, w, w) as { y0: number; y1: number };
    const branches = pruneSpurs(traceSkeleton(zhangSuen(g, w, w), w, w), 4);
    const cut = extractHeadline(branches, band, 3, g, w);
    expect(mergeHeadPieces(cut.pieces, g, w, band, 5)).toHaveLength(2);
  });
});

describe('stroke ordering', () => {
  it('starts open strokes at the upper end, or the left end when level', () => {
    expect(orientStroke(line([0.5, 0.9], [0.5, 0.1]))[0]).toEqual([0.5, 0.1]);
    expect(orientStroke(line([0.9, 0.5], [0.1, 0.52]))[0]).toEqual([0.1, 0.52]);
  });

  it('starts loops at their top point', () => {
    const ring: Pt[] = [
      [0.5, 0.9],
      [0.9, 0.5],
      [0.5, 0.1],
      [0.1, 0.5],
      [0.5, 0.9],
    ];
    const out = orientStroke(ring);
    expect(out[0]).toEqual([0.5, 0.1]);
    expect(out[out.length - 1]).toEqual([0.5, 0.1]);
    expect(out).toHaveLength(5);
  });

  it('detects a headline', () => {
    const glyph = { minX: 0.1, minY: 0.1, maxX: 0.9, maxY: 0.9 };
    expect(isHeadline(line([0.1, 0.12], [0.9, 0.12]), glyph)).toBe(true);
    expect(isHeadline(line([0.1, 0.8], [0.9, 0.8]), glyph)).toBe(false);
    expect(isHeadline(line([0.4, 0.12], [0.45, 0.12]), glyph)).toBe(false);
    // a short but perfectly flat bit at the very top (mātrā right of the stem in প)
    expect(isHeadline(line([0.7, 0.11], [0.85, 0.11]), glyph)).toBe(true);
  });

  it('draws near-horizontal strokes left to right even when slightly slanted', () => {
    expect(orientStroke(line([0.9, 0.5], [0.3, 0.4]))[0]).toEqual([0.3, 0.4]);
  });

  it('detects straight vertical stems', () => {
    const glyph = { minX: 0.1, minY: 0.1, maxX: 0.9, maxY: 0.9 };
    expect(isStem(line([0.5, 0.1], [0.5, 0.9]), glyph)).toBe(true);
    expect(isStem(line([0.5, 0.1], [0.5, 0.2]), glyph)).toBe(false);
    expect(isStem(line([0.2, 0.1], [0.8, 0.9]), glyph)).toBe(false);
    const bow: Pt[] = [
      [0.5, 0.1],
      [0.65, 0.5],
      [0.5, 0.9],
    ];
    expect(isStem(bow, glyph)).toBe(false);
  });

  it('measures the distance between polylines', () => {
    expect(polylineDistance(line([0, 0], [1, 0]), line([0.5, 0.2], [0.5, 1]))).toBeCloseTo(0.2);
    expect(polylineDistance(line([0, 0], [1, 0]), [[0.5, -0.1]])).toBeCloseTo(0.1);
  });

  it('draws the body first, then stems left to right, then the headline left to right', () => {
    const headline = line([0.9, 0.1], [0.1, 0.1]);
    const rightStem = line([0.7, 0.9], [0.7, 0.1]);
    const leftStem = line([0.3, 0.1], [0.3, 0.9]);
    const foot = line([0.2, 0.85], [0.6, 0.85]);
    const out = orderStrokes([headline, foot, rightStem, leftStem], 'Beng');
    expect(out.map(s => s[0])).toEqual([
      [0.2, 0.85],
      [0.3, 0.1],
      [0.7, 0.1],
      [0.1, 0.1],
    ]);
    expect(out[3]?.[out[3].length - 1]).toEqual([0.9, 0.1]);
  });

  it('puts known headlines last, then marks above the headline, then dots', () => {
    const bar = line([0.85, 0.3], [0.15, 0.3]);
    const stem = line([0.5, 0.3], [0.5, 0.9]);
    const arc: Pt[] = [
      [0.4, 0.15],
      [0.5, 0.22],
      [0.6, 0.15],
    ];
    const nukta = line([0.3, 0.95], [0.32, 0.95], 1);
    const out = orderStrokes([nukta, arc, stem], 'Deva', [bar]);
    expect(out.map(s => s[0])).toEqual([
      [0.5, 0.3],
      [0.15, 0.3],
      [0.4, 0.15],
      [0.3, 0.95],
    ]);
  });

  it('writes a number without headline digit by digit, left to right', () => {
    const one = line([0.15, 0.8], [0.3, 0.2]);
    const oneFoot = line([0.35, 0.8], [0.1, 0.8]);
    const twoTop = line([0.6, 0.2], [0.8, 0.4]);
    const twoFoot = line([0.8, 0.4], [0.6, 0.8]);
    const out = orderStrokes([twoFoot, oneFoot, one, twoTop], 'Beng');
    expect(out.map(s => s[0])).toEqual([
      [0.3, 0.2],
      [0.1, 0.8],
      [0.6, 0.2],
      [0.8, 0.4],
    ]);
  });

  it('has no headline rule for Latin', () => {
    const bar = line([0.9, 0.1], [0.1, 0.1]);
    const stem = line([0.5, 0.9], [0.5, 0.3]);
    expect(orderStrokes([stem, bar], 'Latn').map(s => s[0])).toEqual([
      [0.1, 0.1],
      [0.5, 0.3],
    ]);
  });
});

describe('strokesFromOutline', () => {
  it('turns a thin horizontal bar into one left-to-right stroke', () => {
    const strokes = strokesFromOutline('M0.1 0.45L0.9 0.45L0.9 0.55L0.1 0.55Z', 'Latn');
    expect(strokes).toHaveLength(1);
    const s = strokes[0] as Pt[];
    expect(s[0]?.[0]).toBeLessThan(0.2);
    expect(s[s.length - 1]?.[0]).toBeGreaterThan(0.8);
    for (const [x, y] of s) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(Math.abs(y - 0.5)).toBeLessThan(0.03);
    }
  });

  it('turns a plus sign into two strokes', () => {
    const plus =
      'M0.45 0.1L0.55 0.1L0.55 0.45L0.9 0.45L0.9 0.55L0.55 0.55L0.55 0.9L0.45 0.9L0.45 0.55L0.1 0.55L0.1 0.45L0.45 0.45Z';
    expect(strokesFromOutline(plus, 'Latn')).toHaveLength(2);
  });

  it('makes a Devanagari-like glyph: whole stems, one headline last, spur dropped, dot kept', () => {
    const glyph = [
      'M0.1 0.15L0.9 0.15L0.9 0.23L0.1 0.23Z', // headline
      'M0.3 0.23L0.37 0.23L0.37 0.85L0.3 0.85Z', // left stem, hanging from the headline
      'M0.37 0.5L0.41 0.5L0.41 0.56L0.37 0.56Z', // a nub on the left stem (spur)
      'M0.65 0.1L0.72 0.1L0.72 0.9L0.65 0.9Z', // right stem, poking above the headline
      'M0.48 0.89L0.53 0.89L0.53 0.94L0.48 0.94Z', // a dot
    ].join('');
    const strokes = strokesFromOutline(glyph, 'Deva');
    expect(strokes).toHaveLength(4);
    const [leftStem, rightStem, head, dot] = strokes as [Pt[], Pt[], Pt[], Pt[]];
    const start = (s: Pt[]) => s[0] as Pt;
    const end = (s: Pt[]) => s[s.length - 1] as Pt;
    // left stem: one stroke from the headline down
    expect(Math.abs(start(leftStem)[0] - 0.335)).toBeLessThan(0.02);
    expect(start(leftStem)[1]).toBeLessThan(0.25);
    expect(end(leftStem)[1]).toBeGreaterThan(0.8);
    // right stem: one stroke from the headline (its tiny tip above is thinning noise) down
    expect(Math.abs(start(rightStem)[0] - 0.685)).toBeLessThan(0.02);
    expect(start(rightStem)[1]).toBeLessThan(0.25);
    expect(end(rightStem)[1]).toBeGreaterThan(0.85);
    // headline: one stroke, left to right, the full bar
    expect(start(head)[0]).toBeLessThan(0.16);
    expect(end(head)[0]).toBeGreaterThan(0.84);
    expect(Math.abs(start(head)[1] - 0.19)).toBeLessThan(0.02);
    // dot last
    expect(Math.abs(start(dot)[0] - 0.505)).toBeLessThan(0.03);
    expect(Math.abs(start(dot)[1] - 0.915)).toBeLessThan(0.02);
  });

  it('is deterministic', () => {
    const d = 'M0.2 0.2L0.8 0.2L0.8 0.3L0.55 0.3L0.55 0.8L0.45 0.8L0.45 0.3L0.2 0.3Z';
    expect(strokesFromOutline(d, 'Deva')).toEqual(strokesFromOutline(d, 'Deva'));
  });
});

describe('mergeGeometry', () => {
  const entry = (text: string, strokeSource: GlyphGeometry['strokeSource']): GlyphGeometry => ({
    text,
    outline: 'M0 0L1 1Z',
    strokes: [
      {
        points: [
          [0, 0],
          [1, 1],
        ],
      },
    ],
    strokeSource,
  });
  const generate = (t: { text: string }) => entry(t.text, 'auto');

  it('never overwrites reviewed or recorded strokes for unchanged text', () => {
    const existing: GeometryFile = { 'letter:a': entry('a', 'recorded') };
    const warn = jest.fn();
    const out = mergeGeometry(existing, [{ key: 'letter:a', text: 'a' }], generate, warn);
    expect(out['letter:a']?.strokeSource).toBe('recorded');
    expect(warn).not.toHaveBeenCalled();
  });

  it('regenerates and warns when the text of a human entry changed', () => {
    const existing: GeometryFile = { 'letter:a': entry('a', 'reviewed') };
    const warn = jest.fn();
    const out = mergeGeometry(existing, [{ key: 'letter:a', text: 'b' }], generate, warn);
    expect(out['letter:a']).toEqual(entry('b', 'auto'));
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/REPLACED/));
  });

  it('refreshes auto entries, drops orphan auto entries, keeps orphan human entries', () => {
    const existing: GeometryFile = {
      'letter:a': entry('old', 'auto'),
      'letter:x': entry('x', 'auto'),
      'letter:y': entry('y', 'recorded'),
    };
    const warn = jest.fn();
    const out = mergeGeometry(existing, [{ key: 'letter:a', text: 'a' }], generate, warn);
    expect(Object.keys(out).sort()).toEqual(['letter:a', 'letter:y']);
    expect(out['letter:a']?.text).toBe('a');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('serialises with sorted keys and 3 decimals', () => {
    const json = stableGeometryJson({
      'number:1': { ...entry('1', 'auto'), outline: 'M0 0Z' },
      'letter:a': {
        text: 'a',
        outline: 'M0 0Z',
        strokes: [
          {
            points: [
              [0.12345, 0],
              [1, 0.99999],
            ],
          },
        ],
        strokeSource: 'auto',
      },
    });
    const parsed = JSON.parse(json) as Record<string, Record<string, unknown>>;
    expect(Object.keys(parsed)).toEqual(['letter:a', 'number:1']);
    expect(Object.keys(parsed['letter:a'] as object)).toEqual([
      'outline',
      'strokeSource',
      'strokes',
      'text',
    ]);
    expect(json).toContain('0.123');
    expect(json).not.toContain('0.99999');
  });
});
