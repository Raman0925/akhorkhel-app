import type { Vec } from '../scorer';
import { MAX_TRIES, referenceStrokes, startSession, submitStroke } from '../session';

const line = (from: Vec, to: Vec, n = 20): Vec[] =>
  Array.from(
    { length: n },
    (_, i) =>
      [
        from[0] + ((to[0] - from[0]) * i) / (n - 1),
        from[1] + ((to[1] - from[1]) * i) / (n - 1),
      ] as Vec,
  );
const H = line([0.2, 0.5], [0.8, 0.5]);
const V = line([0.5, 0.2], [0.5, 0.8]);
const PLUS = [H, V];
const reversed = (s: Vec[]) => [...s].reverse();

describe('guided session (levels 1–2)', () => {
  it('walks through the strokes and completes with 3 stars', () => {
    let st = startSession(1);
    const a = submitStroke(st, H, PLUS);
    expect(a.feedback.kind).toBe('good');
    st = a.state;
    expect(st.strokeIndex).toBe(1);
    const b = submitStroke(st, V, PLUS);
    expect(b.feedback).toMatchObject({ kind: 'complete' });
    expect(b.state.result?.stars).toBe(3);
    // Further strokes after completion are ignored.
    expect(submitStroke(b.state, H, PLUS).feedback.kind).toBe('ignored');
  });

  it('asks to watch and retry a weak stroke, then accepts it after MAX_TRIES', () => {
    let st = startSession(2);
    for (let i = 0; i < MAX_TRIES - 1; i++) {
      const r = submitStroke(st, reversed(H), PLUS);
      expect(r.feedback).toMatchObject({ kind: 'weak', replayStroke: 0 });
      st = r.state;
    }
    expect(st.retries).toBe(MAX_TRIES - 1);
    const accepted = submitStroke(st, reversed(H), PLUS);
    expect(accepted.feedback.kind).toBe('good');
    expect(accepted.state.strokeIndex).toBe(1);
    expect(accepted.state.tries).toBe(0);
    const done = submitStroke(accepted.state, V, PLUS);
    expect(done.feedback.kind).toBe('complete');
    expect(done.state.result?.stars).toBeLessThan(3);
    expect(done.state.result?.stars).toBeGreaterThanOrEqual(1);
  });

  it('ignores taps', () => {
    const st = startSession(1);
    const r = submitStroke(st, [[0.5, 0.5]], PLUS);
    expect(r.feedback.kind).toBe('ignored');
    expect(r.state).toBe(st);
  });

  it('ignores strokes when there is nothing to trace', () => {
    expect(submitStroke(startSession(1), H, []).feedback.kind).toBe('ignored');
  });
});

describe('memory session (level 3)', () => {
  it('collects strokes and completes order-free', () => {
    let st = startSession(3);
    const a = submitStroke(st, reversed(V), PLUS);
    expect(a.feedback).toEqual({ kind: 'good', stroke: null });
    st = a.state;
    const b = submitStroke(st, reversed(H), PLUS);
    expect(b.feedback.kind).toBe('complete');
    expect(b.state.result).toMatchObject({ good: true, stars: 3 });
  });

  it('asks for another go on a weak glyph, then accepts after MAX_TRIES', () => {
    const wrong = [line([0.2, 0.2], [0.8, 0.8]), line([0.8, 0.2], [0.2, 0.8])]; // an X
    let st = startSession(3);
    for (let i = 0; i < MAX_TRIES - 1; i++) {
      st = submitStroke(st, wrong[0] as Vec[], PLUS).state;
      const r = submitStroke(st, wrong[1] as Vec[], PLUS);
      expect(r.feedback.kind).toBe('weakGlyph');
      st = r.state;
      expect(st.drawn).toEqual([]);
    }
    st = submitStroke(st, wrong[0] as Vec[], PLUS).state;
    const last = submitStroke(st, wrong[1] as Vec[], PLUS);
    expect(last.feedback.kind).toBe('complete');
    expect(last.state.result?.good).toBe(true);
  });

  it('ignores taps', () => {
    const st = startSession(3);
    expect(submitStroke(st, [[0.1, 0.1]], PLUS).feedback.kind).toBe('ignored');
  });
});

it('referenceStrokes exposes the point arrays', () => {
  const pts: [number, number][] = [
    [0, 0],
    [1, 1],
  ];
  expect(referenceStrokes([{ points: pts }])).toEqual([pts]);
});
