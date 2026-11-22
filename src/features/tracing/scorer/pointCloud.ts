/**
 * Whole-glyph point-cloud matching, after the $P recogniser (Vatavu, Anthony & Wobbrock 2012).
 * Used at level 3 ("write it from memory"): stroke order and direction do not matter, and the
 * child may write a bit bigger, smaller or off-centre, because the clouds are normalised first.
 */
import { dist, pathLength, resample, type Vec } from './geometry';

/** Number of points in a cloud. */
export const CLOUD_N = 32;

/**
 * Resample several strokes into one cloud of `n` points, spread over the strokes by length.
 * Taps (zero-length strokes) still contribute their point when nothing else has length.
 */
export function strokesToCloud(strokes: readonly (readonly Vec[])[], n: number = CLOUD_N): Vec[] {
  const nonEmpty = strokes.filter(s => s.length > 0);
  if (nonEmpty.length === 0 || n <= 0) {
    return [];
  }
  const lengths = nonEmpty.map(pathLength);
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return Array.from({ length: n }, (_, i) => (nonEmpty[i % nonEmpty.length] as Vec[])[0] as Vec);
  }
  const out: Vec[] = [];
  let assigned = 0;
  nonEmpty.forEach((s, i) => {
    const isLast = i === nonEmpty.length - 1;
    const share = isLast ? n - assigned : Math.round((n * (lengths[i] as number)) / total);
    const count = Math.max(0, Math.min(share, n - assigned));
    if (count > 0) {
      out.push(...resample(s, count));
      assigned += count;
    }
  });
  return out;
}

/** Translate to the centroid and scale uniformly so the larger side of the bounding box is 1. */
export function normalizeCloud(cloud: readonly Vec[]): Vec[] {
  if (cloud.length === 0) {
    return [];
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of cloud) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    cx += x;
    cy += y;
  }
  cx /= cloud.length;
  cy /= cloud.length;
  const size = Math.max(maxX - minX, maxY - minY, 1e-6);
  return cloud.map(([x, y]) => [(x - cx) / size, (y - cy) / size] as Vec);
}

function cloudDistance(a: readonly Vec[], b: readonly Vec[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let min = Infinity;
    let index = 0;
    for (let j = 0; j < n; j++) {
      if (!matched[j]) {
        const d = dist(a[i] as Vec, b[j] as Vec);
        if (d < min) {
          min = d;
          index = j;
        }
      }
    }
    matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

/**
 * Greedy $P cloud match. Returns the weighted mean point distance between two clouds of the same
 * size, in normalised units (0 = identical). Infinity when either cloud is empty.
 */
export function greedyCloudMatch(a: readonly Vec[], b: readonly Vec[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) {
    return Infinity;
  }
  const aa = a.slice(0, n);
  const bb = b.slice(0, n);
  const step = Math.max(1, Math.floor(Math.sqrt(n))); // n ^ (1 - 0.5)
  let min = Infinity;
  for (let i = 0; i < n; i += step) {
    min = Math.min(min, cloudDistance(aa, bb, i), cloudDistance(bb, aa, i));
  }
  // Sum of weights is (n + 1) / 2; dividing gives a mean distance.
  return min / ((n + 1) / 2);
}

/** Convenience: normalise both stroke sets into clouds and match them. */
export function matchGlyphClouds(
  drawn: readonly (readonly Vec[])[],
  reference: readonly (readonly Vec[])[],
  n: number = CLOUD_N,
): number {
  return greedyCloudMatch(
    normalizeCloud(strokesToCloud(drawn, n)),
    normalizeCloud(strokesToCloud(reference, n)),
  );
}
