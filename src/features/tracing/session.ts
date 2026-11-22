/**
 * One trace of one glyph, as a pure state machine (no React, no RN), so the flow can be unit-tested
 * without gestures. TraceCanvas feeds it finished strokes and reacts to the feedback.
 *
 * Levels 1–2: strokes are traced one by one in order. A weak stroke → replay that stroke's demo and
 * try again. After MAX_TRIES the stroke is accepted anyway, so a child never gets stuck.
 * Level 3: the child writes freely; once as many strokes as the glyph has are drawn, the whole glyph
 * is matched order-free. A weak glyph → watch the demo and write it again (MAX_TRIES at most).
 */
import {
  levelConfig,
  pathLength,
  scoreMemory,
  scoreStroke,
  summarizeGuided,
  type GlyphScore,
  type Level,
  type StrokeScore,
  type Vec,
} from './scorer';

export const MAX_TRIES = 3;

export type SessionState = {
  level: Level;
  /** Reference stroke the child is on (levels 1–2) or strokes drawn so far (level 3). */
  strokeIndex: number;
  /** Tries on the current stroke (levels 1–2) or glyph (level 3). */
  tries: number;
  /** Total extra tries during this trace. */
  retries: number;
  /** Accepted quality per stroke (levels 1–2). */
  qualities: number[];
  /** Accepted strokes (unit box). */
  drawn: Vec[][];
  result: GlyphScore | null;
};

export type Feedback =
  /** Stroke shorter than a tap: nothing happens, ink just disappears. */
  | { kind: 'ignored' }
  /** Good stroke (or accepted after several tries): ink turns green, next stroke. */
  | { kind: 'good'; stroke: StrokeScore | null }
  /** Weak stroke: fade the ink, replay the demo of `replayStroke`, try again. */
  | { kind: 'weak'; stroke: StrokeScore; replayStroke: number }
  /** Level 3 weak glyph: clear, replay the whole demo, write again. */
  | { kind: 'weakGlyph'; result: GlyphScore }
  /** The trace is finished. */
  | { kind: 'complete'; stroke: StrokeScore | null; result: GlyphScore };

export function startSession(level: Level): SessionState {
  return { level, strokeIndex: 0, tries: 0, retries: 0, qualities: [], drawn: [], result: null };
}

export function submitStroke(
  state: SessionState,
  points: readonly Vec[],
  references: readonly (readonly Vec[])[],
): { state: SessionState; feedback: Feedback } {
  if (state.result || references.length === 0) {
    return { state, feedback: { kind: 'ignored' } };
  }
  if (state.level === 3) {
    return submitMemoryStroke(state, points, references);
  }
  const stroke = scoreStroke(points, references, state.strokeIndex, state.level);
  if (stroke.hint === 'tap') {
    return { state, feedback: { kind: 'ignored' } };
  }
  const accepted = stroke.good || state.tries + 1 >= MAX_TRIES;
  if (!accepted) {
    return {
      state: { ...state, tries: state.tries + 1, retries: state.retries + 1 },
      feedback: { kind: 'weak', stroke, replayStroke: state.strokeIndex },
    };
  }
  const qualities = [...state.qualities, stroke.quality];
  const drawn = [...state.drawn, points.slice()];
  const strokeIndex = state.strokeIndex + 1;
  if (strokeIndex >= references.length) {
    const result = summarizeGuided(qualities, state.retries);
    return {
      state: { ...state, qualities, drawn, strokeIndex, tries: 0, result },
      feedback: { kind: 'complete', stroke, result },
    };
  }
  return {
    state: { ...state, qualities, drawn, strokeIndex, tries: 0 },
    feedback: { kind: 'good', stroke },
  };
}

function submitMemoryStroke(
  state: SessionState,
  points: readonly Vec[],
  references: readonly (readonly Vec[])[],
): { state: SessionState; feedback: Feedback } {
  if (pathLength(points) < levelConfig(3).minStrokeLength) {
    return { state, feedback: { kind: 'ignored' } };
  }
  const drawn = [...state.drawn, points.slice()];
  if (drawn.length < references.length) {
    return {
      state: { ...state, drawn, strokeIndex: drawn.length },
      feedback: { kind: 'good', stroke: null },
    };
  }
  const result = scoreMemory(drawn, references);
  if (result.good || state.tries + 1 >= MAX_TRIES) {
    const final = { ...result, good: true };
    return {
      state: { ...state, drawn, strokeIndex: drawn.length, result: final },
      feedback: { kind: 'complete', stroke: null, result: final },
    };
  }
  return {
    state: {
      ...state,
      drawn: [],
      strokeIndex: 0,
      tries: state.tries + 1,
      retries: state.retries + 1,
    },
    feedback: { kind: 'weakGlyph', result },
  };
}

/** Unit-box reference strokes of a traceable as scorer vectors. */
export function referenceStrokes(strokes: readonly { points: readonly [number, number][] }[]) {
  return strokes.map(s => s.points as readonly Vec[]);
}
