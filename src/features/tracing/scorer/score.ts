/**
 * Tracing scorer (handover 5.2). Pure functions, no React Native.
 *
 * There is never a "wrong" result: a stroke is either good, or weak. A weak stroke means the app
 * replays the demo of that stroke and the child tries again. A finished trace always earns 1–3 stars.
 */
import type { Stars } from '@/progress/progress';

import {
  clamp01,
  meanCosine,
  meanPointDistance,
  dist,
  pathLength,
  resample,
  RESAMPLE_N,
  type Vec,
} from './geometry';
import { levelConfig, type Level, type LevelConfig } from './levels';
import { matchGlyphClouds } from './pointCloud';

/** Why a stroke was weak (drives the gentle hint; never shown as an error). */
export type StrokeHint = 'none' | 'tap' | 'start' | 'direction' | 'shape' | 'order';

export type StrokeComparison = {
  startDistance: number;
  direction: number;
  shapeDistance: number;
  /** 0..1 blend of the three checks. */
  quality: number;
  /** All three checks are within the level tolerance. */
  passes: boolean;
};

export type StrokeScore = StrokeComparison & {
  good: boolean;
  hint: StrokeHint;
  /** Index of the reference stroke the drawing resembles most, or -1. */
  bestMatch: number;
};

export type GlyphScore = {
  stars: Stars;
  /** 0..1 */
  quality: number;
  /** Whether the trace is good enough to count (level 3 asks for another go otherwise). */
  good: boolean;
  /** Per drawn stroke (levels 1 and 2 only). */
  strokes: StrokeScore[];
};

const WEAK: StrokeComparison = {
  startDistance: Infinity,
  direction: 0,
  shapeDistance: Infinity,
  quality: 0,
  passes: false,
};

/** Compare one drawn stroke with one reference stroke under a level config. */
export function compareStroke(
  drawn: readonly Vec[],
  reference: readonly Vec[],
  cfg: LevelConfig,
): StrokeComparison {
  if (drawn.length === 0 || reference.length === 0) {
    return WEAK;
  }
  const a = resample(drawn, RESAMPLE_N);
  const b = resample(reference, RESAMPLE_N);
  const startDistance = dist(a[0] as Vec, b[0] as Vec);
  const direction = meanCosine(a, b);
  const shapeDistance = meanPointDistance(a, b);
  const startQ = clamp01(1 - startDistance / (2 * cfg.startTolerance));
  const dirQ = clamp01(direction);
  const shapeQ = clamp01(1 - shapeDistance / (2 * cfg.shapeTolerance));
  return {
    startDistance,
    direction,
    shapeDistance,
    quality: 0.2 * startQ + 0.3 * dirQ + 0.5 * shapeQ,
    passes:
      startDistance <= cfg.startTolerance &&
      direction > cfg.minDirection &&
      shapeDistance < cfg.shapeTolerance,
  };
}

function hintFor(c: StrokeComparison, cfg: LevelConfig): StrokeHint {
  if (c.startDistance > cfg.startTolerance) {
    return 'start';
  }
  if (c.direction <= cfg.minDirection) {
    return 'direction';
  }
  return 'shape';
}

/**
 * Score the stroke the child just drew against reference stroke `index` of the glyph (levels 1–2,
 * where strokes are traced one by one in order). Also checks stroke order: if the drawing fits a
 * different stroke of the glyph better, the hint is `order`.
 */
export function scoreStroke(
  drawn: readonly Vec[],
  references: readonly (readonly Vec[])[],
  index: number,
  level: Level,
): StrokeScore {
  const cfg = levelConfig(level);
  const target = references[index];
  if (!target || target.length === 0) {
    return { ...WEAK, good: false, hint: 'none', bestMatch: -1 };
  }
  if (drawn.length === 0 || pathLength(drawn) < cfg.minStrokeLength) {
    return { ...WEAK, good: false, hint: 'tap', bestMatch: -1 };
  }
  const own = compareStroke(drawn, target, cfg);
  let bestMatch = index;
  let bestShape = own.shapeDistance;
  let otherPasses = false;
  references.forEach((ref, j) => {
    if (j === index) {
      return;
    }
    const c = compareStroke(drawn, ref, cfg);
    if (c.passes && c.shapeDistance < bestShape) {
      bestShape = c.shapeDistance;
      bestMatch = j;
      otherPasses = true;
    }
  });
  if (own.passes) {
    return { ...own, good: true, hint: 'none', bestMatch: index };
  }
  return { ...own, good: false, hint: otherPasses ? 'order' : hintFor(own, cfg), bestMatch };
}

/** Map a 0..1 quality to stars. A finished trace always gets at least one star. */
export function starsFor(quality: number): Exclude<Stars, 0> {
  if (quality >= 0.7) {
    return 3;
  }
  if (quality >= 0.45) {
    return 2;
  }
  return 1;
}

/** Each extra try at a stroke costs a little quality, at most 0.3 in total. */
export const RETRY_PENALTY = 0.1;

/**
 * Summarise a guided (level 1–2) trace from the accepted quality of each stroke and the number of
 * retries the child needed.
 */
export function summarizeGuided(qualities: readonly number[], retries: number): GlyphScore {
  if (qualities.length === 0) {
    return { stars: 1, quality: 0, good: true, strokes: [] };
  }
  const mean = qualities.reduce((a, b) => a + b, 0) / qualities.length;
  const quality = clamp01(mean - Math.min(0.3, Math.max(0, retries) * RETRY_PENALTY));
  return { stars: starsFor(quality), quality, good: true, strokes: [] };
}

/** Level 3: order-free whole-glyph match ($P point cloud). */
export function scoreMemory(
  drawn: readonly (readonly Vec[])[],
  references: readonly (readonly Vec[])[],
): GlyphScore {
  const cfg = levelConfig(3);
  const inkLength = drawn.reduce((acc, s) => acc + pathLength(s), 0);
  const refLength = references.reduce((acc, s) => acc + pathLength(s), 0);
  if (inkLength < cfg.minStrokeLength || refLength === 0) {
    return { stars: 1, quality: 0, good: false, strokes: [] };
  }
  const d = matchGlyphClouds(drawn, references);
  const quality = clamp01(1 - d / (2 * cfg.cloudTolerance));
  return { stars: starsFor(quality), quality, good: d < cfg.cloudTolerance, strokes: [] };
}

/**
 * Score a whole finished glyph in one go. Levels 1–2 pair drawn stroke i with reference stroke i
 * (so order counts; missing strokes count as quality 0); level 3 uses the point-cloud match.
 */
export function scoreGlyph(
  drawn: readonly (readonly Vec[])[],
  references: readonly (readonly Vec[])[],
  level: Level,
): GlyphScore {
  if (level === 3) {
    return scoreMemory(drawn, references);
  }
  if (references.length === 0) {
    return { stars: 1, quality: 0, good: false, strokes: [] };
  }
  const strokes = references.map((_, i) => scoreStroke(drawn[i] ?? [], references, i, level));
  const qualities = strokes.map(s => s.quality);
  const summary = summarizeGuided(qualities, 0);
  return { ...summary, good: strokes.every(s => s.good), strokes };
}
