import type { Vec } from '../geometry';
import { LEVELS, levelConfig } from '../levels';
import { greedyCloudMatch, matchGlyphClouds, normalizeCloud, strokesToCloud } from '../pointCloud';
import {
  compareStroke,
  scoreGlyph,
  scoreMemory,
  scoreStroke,
  starsFor,
  summarizeGuided,
} from '../score';
import { snapPoint } from '../snap';

const line = (from: Vec, to: Vec, n = 20): Vec[] =>
  Array.from(
    { length: n },
    (_, i) =>
      [
        from[0] + ((to[0] - from[0]) * i) / (n - 1),
        from[1] + ((to[1] - from[1]) * i) / (n - 1),
      ] as Vec,
  );
const shift = (pts: readonly Vec[], dx: number, dy: number): Vec[] =>
  pts.map(([x, y]) => [x + dx, y + dy] as Vec);

/** A "plus" sign: horizontal bar, then vertical bar. */
const H = line([0.2, 0.5], [0.8, 0.5]);
const V = line([0.5, 0.2], [0.5, 0.8]);
const PLUS = [H, V];
/** A curve: half circle. */
const ARC: Vec[] = Array.from({ length: 30 }, (_, i) => {
  const a = Math.PI + (Math.PI * i) / 29;
  return [0.5 + 0.3 * Math.cos(a), 0.5 + 0.3 * Math.sin(a)] as Vec;
});

describe('levels', () => {
  it('get stricter from level 1 to 2 and snap only on level 1', () => {
    expect(LEVELS[1].shapeTolerance).toBeGreaterThan(LEVELS[2].shapeTolerance);
    expect(LEVELS[1].startTolerance).toBeGreaterThan(LEVELS[2].startTolerance);
    expect(LEVELS[1].snapStrength).toBeGreaterThan(0);
    expect(LEVELS[2].snapStrength).toBe(0);
    expect(LEVELS[1].minDirection).toBe(0.6);
  });
  it('falls back to level 1 for odd values', () => {
    expect(levelConfig(7)).toBe(LEVELS[1]);
    expect(levelConfig(3)).toBe(LEVELS[3]);
  });
});

describe('compareStroke', () => {
  const cfg = LEVELS[2];
  it('passes an exact copy', () => {
    const c = compareStroke(H, H, cfg);
    expect(c.passes).toBe(true);
    expect(c.quality).toBeCloseTo(1);
    expect(c.startDistance).toBeCloseTo(0);
    expect(c.direction).toBeCloseTo(1);
  });
  it('does not care how many points the child produced', () => {
    expect(compareStroke(line([0.2, 0.5], [0.8, 0.5], 200), H, cfg).passes).toBe(true);
    expect(
      compareStroke(
        [
          [0.2, 0.5],
          [0.8, 0.5],
        ],
        H,
        cfg,
      ).passes,
    ).toBe(true);
  });
  it('fails a reversed stroke on direction', () => {
    const c = compareStroke([...H].reverse(), H, cfg);
    expect(c.passes).toBe(false);
    expect(c.direction).toBeLessThan(0);
  });
  it('is weak for empty input', () => {
    expect(compareStroke([], H, cfg).passes).toBe(false);
    expect(compareStroke(H, [], cfg).quality).toBe(0);
  });
});

describe('scoreStroke', () => {
  it('accepts a slightly wobbly copy as good', () => {
    const wobbly = H.map(([x, y], i) => [x, y + (i % 2 ? 0.02 : -0.02)] as Vec);
    const s = scoreStroke(wobbly, PLUS, 0, 2);
    expect(s.good).toBe(true);
    expect(s.hint).toBe('none');
    expect(s.bestMatch).toBe(0);
  });

  it('accepts the same curve at level 1 with a wide offset, but not at level 2', () => {
    const off = shift(ARC, 0.12, 0.05);
    expect(scoreStroke(off, [ARC], 0, 1).good).toBe(true);
    expect(scoreStroke(off, [ARC], 0, 2).good).toBe(false);
  });

  it('says "start" when the stroke begins far from the start dot', () => {
    const s = scoreStroke(line([0.2, 0.9], [0.8, 0.5]), PLUS, 0, 2);
    expect(s.good).toBe(false);
    expect(s.hint).toBe('start');
  });

  it('says "direction" for a stroke drawn backwards from near the start', () => {
    // Starts at the reference start, goes left instead of right.
    const s = scoreStroke(line([0.25, 0.5], [0.0, 0.5]), [line([0.2, 0.5], [0.45, 0.5])], 0, 1);
    expect(s.good).toBe(false);
    expect(s.hint).toBe('direction');
  });

  it('says "shape" when start and direction are fine but the path wanders', () => {
    const wander = line([0.2, 0.5], [0.8, 0.75]);
    const s = scoreStroke(wander, [H], 0, 2);
    expect(s.good).toBe(false);
    expect(s.hint).toBe('shape');
  });

  it('says "order" when the child draws a different stroke of the glyph', () => {
    const s = scoreStroke(V, PLUS, 0, 2);
    expect(s.good).toBe(false);
    expect(s.hint).toBe('order');
    expect(s.bestMatch).toBe(1);
  });

  it('treats taps and empty strokes as taps (never throws)', () => {
    expect(scoreStroke([[0.5, 0.5]], PLUS, 0, 1).hint).toBe('tap');
    expect(scoreStroke([], PLUS, 0, 1).hint).toBe('tap');
    expect(
      scoreStroke(
        [
          [0.5, 0.5],
          [0.505, 0.5],
        ],
        PLUS,
        0,
        1,
      ).hint,
    ).toBe('tap');
  });

  it('handles a missing or empty reference without throwing', () => {
    expect(scoreStroke(H, [], 0, 1)).toMatchObject({ good: false, hint: 'none', bestMatch: -1 });
    expect(scoreStroke(H, PLUS, 5, 1).good).toBe(false);
    expect(scoreStroke(H, [[]], 0, 1).good).toBe(false);
  });
});

describe('stars', () => {
  it('maps quality to 1–3 stars, never 0', () => {
    expect(starsFor(0)).toBe(1);
    expect(starsFor(0.5)).toBe(2);
    expect(starsFor(0.95)).toBe(3);
  });

  it('summarises guided traces with a capped retry penalty', () => {
    expect(summarizeGuided([1, 1], 0)).toMatchObject({ stars: 3, quality: 1, good: true });
    expect(summarizeGuided([1, 1], 1).quality).toBeCloseTo(0.9);
    expect(summarizeGuided([1, 1], 10).quality).toBeCloseTo(0.7);
    expect(summarizeGuided([0.5], -2).quality).toBeCloseTo(0.5);
    expect(summarizeGuided([], 0)).toMatchObject({ stars: 1, quality: 0 });
  });
});

describe('scoreGlyph (levels 1–2)', () => {
  it('gives 3 stars for a clean trace in order', () => {
    const g = scoreGlyph(PLUS, PLUS, 1);
    expect(g.stars).toBe(3);
    expect(g.good).toBe(true);
    expect(g.strokes).toHaveLength(2);
  });

  it('marks swapped stroke order as not good', () => {
    const g = scoreGlyph([V, H], PLUS, 2);
    expect(g.good).toBe(false);
    expect(g.strokes.map(s => s.hint)).toEqual(['order', 'order']);
    expect(g.stars).toBeGreaterThanOrEqual(1);
  });

  it('counts missing strokes as weak', () => {
    const g = scoreGlyph([H], PLUS, 2);
    expect(g.good).toBe(false);
    expect(g.strokes[1]?.hint).toBe('tap');
  });

  it('handles an empty reference', () => {
    expect(scoreGlyph([H], [], 1)).toMatchObject({ stars: 1, good: false });
  });
});

describe('scoreMemory / scoreGlyph level 3 ($P)', () => {
  it('accepts the glyph in any stroke order and direction', () => {
    const drawn = [[...V].reverse(), [...H].reverse()];
    const g = scoreGlyph(drawn, PLUS, 3);
    expect(g.good).toBe(true);
    expect(g.stars).toBe(3);
  });

  it('accepts a smaller, off-centre copy', () => {
    const small = PLUS.map(s => s.map(([x, y]) => [0.1 + x * 0.5, 0.1 + y * 0.5] as Vec));
    expect(scoreMemory(small, PLUS).good).toBe(true);
  });

  it('does not accept a different shape', () => {
    const g = scoreMemory([ARC], PLUS);
    expect(g.good).toBe(false);
    expect(g.stars).toBeGreaterThanOrEqual(1);
  });

  it('does not accept a T or an X for a plus', () => {
    const T = [line([0.2, 0.2], [0.8, 0.2]), line([0.5, 0.2], [0.5, 0.8])];
    const X = [line([0.2, 0.2], [0.8, 0.8]), line([0.8, 0.2], [0.2, 0.8])];
    expect(scoreMemory(T, PLUS).good).toBe(false);
    expect(scoreMemory(X, PLUS).good).toBe(false);
  });

  it('handles taps and empty input', () => {
    expect(scoreMemory([], PLUS)).toMatchObject({ good: false, stars: 1 });
    expect(scoreMemory([[[0.5, 0.5]]], PLUS).good).toBe(false);
    expect(scoreMemory(PLUS, []).good).toBe(false);
  });
});

describe('point cloud', () => {
  it('spreads points over strokes by length', () => {
    const cloud = strokesToCloud([line([0, 0], [1, 0]), line([0, 0], [0, 0.25])], 10);
    expect(cloud).toHaveLength(10);
    expect(cloud.filter(([, y]) => y === 0).length).toBeGreaterThanOrEqual(8);
  });

  it('handles empty, zero-length and n <= 0 inputs', () => {
    expect(strokesToCloud([], 8)).toEqual([]);
    expect(strokesToCloud([[]], 8)).toEqual([]);
    expect(strokesToCloud([H], 0)).toEqual([]);
    const taps = strokesToCloud([[[0.1, 0.1]], [[0.9, 0.9]]], 4);
    expect(taps).toEqual([
      [0.1, 0.1],
      [0.9, 0.9],
      [0.1, 0.1],
      [0.9, 0.9],
    ]);
  });

  it('normalises to the centroid and unit size', () => {
    const n = normalizeCloud([
      [0, 0],
      [2, 0],
    ]);
    expect(n).toEqual([
      [-0.5, 0],
      [0.5, 0],
    ]);
    expect(normalizeCloud([])).toEqual([]);
    expect(
      normalizeCloud([
        [0.3, 0.3],
        [0.3, 0.3],
      ]),
    ).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it('matches identical clouds with distance 0 and empty clouds with Infinity', () => {
    const c = normalizeCloud(strokesToCloud(PLUS));
    expect(greedyCloudMatch(c, c)).toBeCloseTo(0);
    expect(greedyCloudMatch([], c)).toBe(Infinity);
    expect(matchGlyphClouds(PLUS, PLUS)).toBeCloseTo(0);
  });
});

describe('snapPoint (level 1 ink snapping)', () => {
  const ref = [0, 0, 100, 0, 100, 100];
  it('pulls nearby points toward the reference', () => {
    expect(snapPoint(50, 10, ref, 0.5, 20)).toEqual([50, 5]);
    expect(snapPoint(110, 50, ref, 1, 20)).toEqual([100, 50]);
    expect(snapPoint(50, 10, ref, 3, 20)).toEqual([50, 0]);
  });
  it('leaves far points, zero strength and empty references alone', () => {
    expect(snapPoint(50, 60, ref, 0.5, 20)).toEqual([50, 60]);
    expect(snapPoint(50, 10, ref, 0, 20)).toEqual([50, 10]);
    expect(snapPoint(50, 10, [], 0.5, 20)).toEqual([50, 10]);
  });
  it('works with a single-point or degenerate reference', () => {
    expect(snapPoint(3, 4, [0, 0], 1, 10)).toEqual([0, 0]);
    expect(snapPoint(3, 4, [0, 0, 0, 0], 1, 10)).toEqual([0, 0]);
  });
});
