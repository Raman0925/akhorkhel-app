import {
  appendDigit,
  COOLDOWN_MS,
  createChallenge,
  INITIAL_STATE,
  isLocked,
  MAX_MISSES,
  secondsLeft,
  submit,
  type Challenge,
  type GateState,
} from '../challenge';

describe('createChallenge', () => {
  it('is a two-digit × one-digit multiplication', () => {
    for (let i = 0; i < 300; i++) {
      const c = createChallenge();
      expect(c.a).toBeGreaterThanOrEqual(11);
      expect(c.a).toBeLessThanOrEqual(19);
      expect(c.b).toBeGreaterThanOrEqual(3);
      expect(c.b).toBeLessThanOrEqual(9);
      expect(c.answer).toBe(c.a * c.b);
    }
  });

  it('is driven by the rng', () => {
    expect(createChallenge(() => 0)).toEqual({ a: 11, b: 3, answer: 33 });
    expect(createChallenge(() => 0.9999)).toEqual({ a: 19, b: 9, answer: 171 });
  });

  it('never repeats the previous question', () => {
    const previous: Challenge = { a: 11, b: 3, answer: 33 };
    expect(createChallenge(() => 0, previous)).toEqual({ a: 12, b: 3, answer: 36 });
    expect(createChallenge(() => 0.9999, { a: 19, b: 9, answer: 171 })).toEqual({
      a: 11,
      b: 9,
      answer: 99,
    });
  });

  it('varies between calls', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) {
      seen.add(createChallenge().answer);
    }
    expect(seen.size).toBeGreaterThan(20);
  });
});

describe('submit', () => {
  const c: Challenge = { a: 14, b: 6, answer: 84 };

  it('passes on the right answer and clears misses', () => {
    expect(submit(c, '84', { misses: 2, lockedUntil: 0 }, 0)).toEqual({
      kind: 'passed',
      state: INITIAL_STATE,
    });
  });

  it('counts wrong answers, then locks for 30 seconds', () => {
    let state: GateState = INITIAL_STATE;
    for (let i = 1; i < MAX_MISSES; i++) {
      const r = submit(c, '80', state, 1000);
      expect(r).toEqual({ kind: 'wrong', state: { misses: i, lockedUntil: 0 } });
      state = r.state;
    }
    const locked = submit(c, '', state, 1000);
    expect(locked).toEqual({
      kind: 'locked',
      state: { misses: 0, lockedUntil: 1000 + COOLDOWN_MS },
    });
    state = locked.state;

    expect(isLocked(state, 1000 + COOLDOWN_MS - 1)).toBe(true);
    expect(secondsLeft(state, 1000)).toBe(30);
    expect(secondsLeft(state, 1000 + COOLDOWN_MS - 1500)).toBe(2);
    // Even the right answer is refused during the cooldown.
    expect(submit(c, '84', state, 2000)).toEqual({ kind: 'locked', state });
    // Afterwards it works again.
    expect(isLocked(state, 1000 + COOLDOWN_MS)).toBe(false);
    expect(secondsLeft(state, 1000 + COOLDOWN_MS)).toBe(0);
    expect(submit(c, '84', state, 1000 + COOLDOWN_MS).kind).toBe('passed');
  });
});

describe('appendDigit', () => {
  it('limits to 3 digits and ignores a leading zero', () => {
    expect(appendDigit('', 0)).toBe('');
    expect(appendDigit('', 8)).toBe('8');
    expect(appendDigit('8', 0)).toBe('80');
    expect(appendDigit('123', 4)).toBe('123');
  });
});
