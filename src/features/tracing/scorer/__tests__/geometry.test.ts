import {
  clamp01,
  closestOnPolyline,
  closestOnSegment,
  dist,
  meanCosine,
  meanPointDistance,
  pathLength,
  resample,
  roundUnit,
  simplify,
  simplifyStroke,
  type Vec,
} from '../geometry';

const line = (n: number, from: Vec, to: Vec): Vec[] =>
  Array.from(
    { length: n },
    (_, i) =>
      [
        from[0] + ((to[0] - from[0]) * i) / (n - 1),
        from[1] + ((to[1] - from[1]) * i) / (n - 1),
      ] as Vec,
  );

describe('pathLength / dist', () => {
  it('measures polylines', () => {
    expect(dist([0, 0], [3, 4])).toBe(5);
    expect(pathLength([])).toBe(0);
    expect(pathLength([[0.5, 0.5]])).toBe(0);
    expect(
      pathLength([
        [0, 0],
        [1, 0],
        [1, 1],
      ]),
    ).toBe(2);
  });
});

describe('resample', () => {
  it('returns [] for empty input or n <= 0', () => {
    expect(resample([])).toEqual([]);
    expect(resample([[0, 0]], 0)).toEqual([]);
  });

  it('repeats the point of a tap', () => {
    const r = resample(
      [
        [0.2, 0.3],
        [0.2, 0.3],
      ],
      5,
    );
    expect(r).toHaveLength(5);
    r.forEach(p => expect(p).toEqual([0.2, 0.3]));
    expect(resample([[0.1, 0.1]], 3)).toEqual([
      [0.1, 0.1],
      [0.1, 0.1],
      [0.1, 0.1],
    ]);
  });

  it('gives one point when n is 1', () => {
    expect(
      resample(
        [
          [0, 0],
          [1, 1],
        ],
        1,
      ),
    ).toEqual([[0, 0]]);
  });

  it('spaces points equally along a polyline', () => {
    const r = resample(
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      5,
    );
    expect(r).toHaveLength(5);
    expect(r[0]).toEqual([0, 0]);
    expect(r[2]?.[0]).toBeCloseTo(1);
    expect(r[2]?.[1]).toBeCloseTo(0);
    expect(r[4]?.[0]).toBeCloseTo(1);
    expect(r[4]?.[1]).toBeCloseTo(1);
    for (let i = 1; i < r.length; i++) {
      expect(dist(r[i - 1] as Vec, r[i] as Vec)).toBeCloseTo(0.5, 5);
    }
  });

  it('defaults to 32 points and handles duplicate points', () => {
    const r = resample([
      [0, 0],
      [0, 0],
      [0.5, 0],
      [0.5, 0],
      [1, 0],
    ]);
    expect(r).toHaveLength(32);
    expect(r[31]?.[0]).toBeCloseTo(1);
  });
});

describe('meanCosine', () => {
  const a = line(10, [0, 0], [1, 0]);
  it('is 1 for the same direction and -1 for reversed', () => {
    expect(meanCosine(a, a)).toBeCloseTo(1);
    expect(meanCosine(a, [...a].reverse())).toBeCloseTo(-1);
  });
  it('is 0 for perpendicular or degenerate input', () => {
    expect(meanCosine(a, line(10, [0, 0], [0, 1]))).toBeCloseTo(0);
    expect(meanCosine(a, line(10, [0.5, 0.5], [0.5, 0.5]))).toBe(0);
    expect(meanCosine([], [])).toBe(0);
  });
});

describe('meanPointDistance', () => {
  it('averages point distances', () => {
    expect(meanPointDistance(line(4, [0, 0], [1, 0]), line(4, [0, 0.1], [1, 0.1]))).toBeCloseTo(
      0.1,
    );
    expect(meanPointDistance([], [])).toBe(Infinity);
  });
});

describe('closest points', () => {
  it('projects onto a segment, clamped to its ends', () => {
    expect(closestOnSegment([0.5, 1], [0, 0], [1, 0])).toEqual([0.5, 0]);
    expect(closestOnSegment([-1, 1], [0, 0], [1, 0])).toEqual([0, 0]);
    expect(closestOnSegment([2, 1], [0, 0], [1, 0])).toEqual([1, 0]);
    expect(closestOnSegment([2, 1], [0.3, 0.3], [0.3, 0.3])).toEqual([0.3, 0.3]);
  });
  it('finds the closest point on a polyline', () => {
    const l: Vec[] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    expect(closestOnPolyline([1.2, 0.5], l)).toEqual([1, 0.5]);
    expect(closestOnPolyline([0.2, 0.2], [[0.5, 0.5]])).toEqual([0.5, 0.5]);
    expect(closestOnPolyline([0, 0], [])).toBeNull();
  });
});

describe('simplify (RDP)', () => {
  it('keeps short input as is', () => {
    expect(simplify([[0, 0]], 0.1)).toEqual([[0, 0]]);
  });
  it('drops collinear points and keeps corners', () => {
    const pts: Vec[] = [...line(10, [0, 0], [1, 0]), ...line(10, [1, 0], [1, 1]).slice(1)];
    const s = simplify(pts, 0.01);
    expect(s).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
  });
});

describe('simplifyStroke', () => {
  it('returns [] for no points and a dot pair for a single point', () => {
    expect(simplifyStroke([])).toEqual([]);
    expect(simplifyStroke([[0.123456, 2]])).toEqual([
      [0.1235, 1],
      [0.1235, 1],
    ]);
  });
  it('caps the number of points', () => {
    const wiggle: Vec[] = Array.from({ length: 400 }, (_, i) => [
      i / 399,
      0.5 + 0.2 * Math.sin(i / 5),
    ]);
    const s = simplifyStroke(wiggle, 0.0001, 20);
    expect(s.length).toBeLessThanOrEqual(20);
    expect(s.length).toBeGreaterThanOrEqual(2);
    s.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    });
  });
});

describe('clamp helpers', () => {
  it('clamps and rounds', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
    expect(roundUnit(0.123456)).toBe(0.1235);
    expect(roundUnit(0.123456, 2)).toBe(0.12);
    expect(roundUnit(-3)).toBe(0);
  });
});
