/**
 * Pure 2D helpers for the tracing scorer. No React Native imports: this folder runs in Jest, in tools
 * (`npx tsx`) and on the JS thread of the app. All coordinates are in the glyph unit box (0..1,
 * y down) unless a caller says otherwise.
 */

export type Vec = readonly [number, number];

/** Number of points every stroke is resampled to before comparing (handover 5.2). */
export const RESAMPLE_N = 32;

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function pathLength(points: readonly Vec[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1] as Vec, points[i] as Vec);
  }
  return len;
}

/**
 * Resample a polyline to `n` points spaced equally along its length ($1 recogniser style).
 * Empty input gives `[]`; a zero-length polyline (a tap) gives `n` copies of its first point.
 */
export function resample(points: readonly Vec[], n: number = RESAMPLE_N): Vec[] {
  const first = points[0];
  if (!first || n <= 0) {
    return [];
  }
  const total = pathLength(points);
  if (n === 1 || total === 0) {
    return Array.from({ length: n }, () => first);
  }
  const step = total / (n - 1);
  const out: Vec[] = [first];
  let acc = 0;
  let prev: Vec = first;
  for (let i = 1; i < points.length && out.length < n; i++) {
    const cur = points[i] as Vec;
    let d = dist(prev, cur);
    while (d > 0 && acc + d >= step && out.length < n) {
      const t = (step - acc) / d;
      const q: Vec = [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])];
      out.push(q);
      prev = q;
      d = dist(prev, cur);
      acc = 0;
    }
    acc += d;
    prev = cur;
  }
  // Floating point can leave us one short: pad with the last input point.
  const last = points[points.length - 1] as Vec;
  while (out.length < n) {
    out.push(last);
  }
  return out;
}

/** Mean cosine between corresponding segment vectors (1 = same direction, -1 = reversed). */
export function meanCosine(a: readonly Vec[], b: readonly Vec[]): number {
  const m = Math.min(a.length, b.length);
  let sum = 0;
  let count = 0;
  for (let i = 1; i < m; i++) {
    const ax = (a[i] as Vec)[0] - (a[i - 1] as Vec)[0];
    const ay = (a[i] as Vec)[1] - (a[i - 1] as Vec)[1];
    const bx = (b[i] as Vec)[0] - (b[i - 1] as Vec)[0];
    const by = (b[i] as Vec)[1] - (b[i - 1] as Vec)[1];
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la === 0 || lb === 0) {
      continue;
    }
    sum += (ax * bx + ay * by) / (la * lb);
    count++;
  }
  return count === 0 ? 0 : sum / count;
}

/** Mean distance between corresponding points of two equally long point lists. */
export function meanPointDistance(a: readonly Vec[], b: readonly Vec[]): number {
  const m = Math.min(a.length, b.length);
  if (m === 0) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < m; i++) {
    sum += dist(a[i] as Vec, b[i] as Vec);
  }
  return sum / m;
}

/** Closest point to `p` on the segment a–b. */
export function closestOnSegment(p: Vec, a: Vec, b: Vec): Vec {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    return a;
  }
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return [a[0] + t * dx, a[1] + t * dy];
}

/** Closest point to `p` on a polyline (the polyline's only point if it has one). */
export function closestOnPolyline(p: Vec, line: readonly Vec[]): Vec | null {
  const first = line[0];
  if (!first) {
    return null;
  }
  let best: Vec = first;
  let bestD = dist(p, first);
  for (let i = 1; i < line.length; i++) {
    const q = closestOnSegment(p, line[i - 1] as Vec, line[i] as Vec);
    const d = dist(p, q);
    if (d < bestD) {
      best = q;
      bestD = d;
    }
  }
  return best;
}

/** Ramer–Douglas–Peucker simplification. Keeps the first and last point. */
export function simplify(points: readonly Vec[], epsilon: number): Vec[] {
  if (points.length < 3) {
    return points.slice();
  }
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [s, e] = stack.pop() as [number, number];
    let maxD = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const p = points[i] as Vec;
      const d = dist(p, closestOnSegment(p, points[s] as Vec, points[e] as Vec));
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > epsilon) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Clamp a number into 0..1 and round to `digits` decimals (for stored geometry). */
export function roundUnit(v: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(Math.max(0, Math.min(1, v)) * f) / f;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Simplify a stored stroke: RDP with a growing epsilon until it has at most `maxPoints` points, then
 * round to 4 decimals inside the unit box. Always keeps at least 2 points (a tap becomes a dot pair).
 */
export function simplifyStroke(
  points: readonly Vec[],
  epsilon = 0.004,
  maxPoints = 40,
): [number, number][] {
  if (points.length === 0) {
    return [];
  }
  let eps = epsilon;
  let out = simplify(points, eps);
  while (out.length > maxPoints && eps < 0.5) {
    eps *= 1.5;
    out = simplify(points, eps);
  }
  const rounded = out.map(([x, y]) => [roundUnit(x), roundUnit(y)] as [number, number]);
  if (rounded.length === 1) {
    rounded.push([...(rounded[0] as [number, number])]);
  }
  return rounded;
}
