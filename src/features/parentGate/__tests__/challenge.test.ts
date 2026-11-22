import {
  CHALLENGE_LENGTH,
  createChallenge,
  KEYPAD_DIGITS,
  MAX_MISSES,
  START,
  tap,
  type Challenge,
} from '../challenge';

/** Deterministic rng from a list of values in [0, 1). */
const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] as number;
};

describe('createChallenge', () => {
  it('returns distinct keypad digits of the right length', () => {
    for (let i = 0; i < 200; i++) {
      const { order } = createChallenge();
      expect(order).toHaveLength(CHALLENGE_LENGTH);
      expect(new Set(order).size).toBe(CHALLENGE_LENGTH);
      order.forEach(d => expect(KEYPAD_DIGITS).toContain(d));
    }
  });

  it('is driven by the rng (0 picks the first remaining digit)', () => {
    expect(createChallenge(() => 0).order).toEqual([1, 2, 3]);
    expect(createChallenge(() => 0.999).order).toEqual([9, 8, 7]);
  });

  it('never repeats the previous challenge', () => {
    const previous: Challenge = { order: [1, 2, 3] };
    const next = createChallenge(() => 0, previous);
    expect(next.order).not.toEqual(previous.order);
    expect(new Set(next.order).size).toBe(CHALLENGE_LENGTH);
  });

  it('varies between calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seen.add(createChallenge().order.join(''));
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it('uses the rng for every pick', () => {
    expect(createChallenge(seq([0.5, 0, 0.99])).order).toEqual([5, 1, 9]);
  });
});

describe('tap', () => {
  const challenge: Challenge = { order: [7, 2, 9] };

  it('passes after the digits are tapped in order', () => {
    const a = tap(challenge, START, 7);
    expect(a).toEqual({ kind: 'progress', state: { step: 1, misses: 0 } });
    const b = a.kind === 'progress' ? tap(challenge, a.state, 2) : a;
    expect(b).toEqual({ kind: 'progress', state: { step: 2, misses: 0 } });
    const c = b.kind === 'progress' ? tap(challenge, b.state, 9) : b;
    expect(c).toEqual({ kind: 'passed' });
  });

  it('restarts the sequence on a wrong tap and keeps the challenge', () => {
    expect(tap(challenge, { step: 2, misses: 0 }, 1)).toEqual({
      kind: 'miss',
      state: { step: 0, misses: 1 },
    });
  });

  it('asks for a new challenge after too many misses', () => {
    expect(tap(challenge, { step: 0, misses: MAX_MISSES - 1 }, 1)).toEqual({
      kind: 'newChallenge',
    });
  });
});
