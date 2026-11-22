/** Turns strokes recorded on screen into a geometry.json entry (pure; unit-tested). */
import type { GlyphGeometry, Traceable } from '@/content';

import { pathLength, simplifyStroke, type Vec } from '../scorer';

/** Strokes shorter than this (unit box) are accidental taps and are dropped. */
const MIN_RECORDED_LENGTH = 0.01;

/** Pixel points (flat [x0, y0, ...]) on a `size`×`size` canvas → normalised, simplified stroke. */
export function normaliseRecordedStroke(flat: readonly number[], size: number): [number, number][] {
  if (size <= 0) {
    return [];
  }
  const pts: Vec[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pts.push([(flat[i] as number) / size, (flat[i + 1] as number) / size]);
  }
  if (pathLength(pts) < MIN_RECORDED_LENGTH) {
    return [];
  }
  return simplifyStroke(pts);
}

export function buildGeometryEntry(
  item: Pick<Traceable, 'key' | 'display' | 'outline'>,
  strokes: readonly (readonly [number, number][])[],
): Record<string, GlyphGeometry> {
  return {
    [item.key]: {
      text: item.display,
      outline: item.outline,
      strokes: strokes.filter(s => s.length >= 2).map(s => ({ points: s.map(p => [p[0], p[1]]) })),
      strokeSource: 'recorded',
    },
  };
}

/** JSON to paste into src/content/packs/<id>/geometry.json (the object's single key/value pair). */
export function geometryJson(
  item: Pick<Traceable, 'key' | 'display' | 'outline'>,
  strokes: readonly (readonly [number, number][])[],
): string {
  return JSON.stringify(buildGeometryEntry(item, strokes), null, 2);
}
