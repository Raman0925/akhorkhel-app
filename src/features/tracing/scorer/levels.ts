/**
 * Tolerances per tracing level (handover 5.2), in glyph unit-box units (1 = the full box width).
 *
 *   L1 guided:     wide tolerance, ink is pulled ("snapped") toward the guide while drawing
 *   L2 faded:      medium tolerance, faded guide, no snapping
 *   L3 memory:     empty box, whole-glyph point-cloud match, stroke order and direction free
 */
export type Level = 1 | 2 | 3;

export type LevelConfig = {
  /** Max distance of the first drawn point from the reference start. */
  startTolerance: number;
  /** Mean cosine between drawn and reference segments must be above this. */
  minDirection: number;
  /** Mean resampled point distance must be below this. */
  shapeTolerance: number;
  /** 0..1: how far ink is pulled toward the reference while drawing (0 = off). */
  snapStrength: number;
  /** Ink further than this from the reference is not snapped. */
  snapRadius: number;
  /** Level 3: weighted mean point-cloud distance (normalised glyph units) that still counts. */
  cloudTolerance: number;
  /** Strokes shorter than this (in unit-box units) are treated as taps. */
  minStrokeLength: number;
};

const BASE = { minDirection: 0.6, minStrokeLength: 0.02, cloudTolerance: 0.11 };

export const LEVELS: Record<Level, LevelConfig> = {
  1: {
    ...BASE,
    startTolerance: 0.2,
    shapeTolerance: 0.15,
    snapStrength: 0.45,
    snapRadius: 0.14,
  },
  2: {
    ...BASE,
    startTolerance: 0.15,
    shapeTolerance: 0.1,
    snapStrength: 0,
    snapRadius: 0,
  },
  3: {
    ...BASE,
    startTolerance: 0.15,
    shapeTolerance: 0.1,
    snapStrength: 0,
    snapRadius: 0,
  },
};

export function levelConfig(level: number): LevelConfig {
  return LEVELS[(level === 2 || level === 3 ? level : 1) as Level];
}
