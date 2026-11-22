/** JS-thread Skia path builders for the tracing canvas (built once per stroke / size, never per frame). */
import { Skia, type SkPath } from '@shopify/react-native-skia';

import { resample, type Vec } from '../scorer';

/** A polyline from a flat [x0, y0, x1, y1, ...] pixel array. One point becomes a tiny dot. */
export function flatPolylinePath(flat: readonly number[]): SkPath {
  const b = Skia.PathBuilder.Make();
  if (flat.length >= 2) {
    b.moveTo(flat[0] as number, flat[1] as number);
    if (flat.length === 2) {
      b.lineTo((flat[0] as number) + 0.5, flat[1] as number);
    }
    for (let i = 2; i + 1 < flat.length; i += 2) {
      b.lineTo(flat[i] as number, flat[i + 1] as number);
    }
  }
  return b.build();
}

/** Unit-box points scaled to `size` pixels. */
export function scalePoints(points: readonly Vec[], size: number): Vec[] {
  return points.map(([x, y]) => [x * size, y * size] as Vec);
}

/** Flat pixel array of a unit-box stroke resampled to `n` points (for worklets). */
export function resampledFlat(points: readonly Vec[], size: number, n = 32): number[] {
  const out: number[] = [];
  for (const [x, y] of resample(points, n)) {
    out.push(x * size, y * size);
  }
  return out;
}

export function strokePath(points: readonly Vec[], size: number): SkPath {
  const flat: number[] = [];
  for (const [x, y] of points) {
    flat.push(x * size, y * size);
  }
  return flatPolylinePath(flat);
}

/** Arrow head pointing along +x, centred on the origin. */
export function arrowHeadPath(s: number): SkPath {
  return Skia.PathBuilder.Make()
    .moveTo(s, 0)
    .lineTo(-s * 0.7, s * 0.75)
    .lineTo(-s * 0.35, 0)
    .lineTo(-s * 0.7, -s * 0.75)
    .close()
    .build();
}

/** Outline SVG path (unit box) parsed once; null if empty or unparsable. */
export function outlinePath(svg: string): SkPath | null {
  if (!svg) {
    return null;
  }
  try {
    return Skia.Path.MakeFromSVGString(svg);
  } catch {
    return null;
  }
}
