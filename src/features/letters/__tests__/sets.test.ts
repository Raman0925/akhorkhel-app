import type { ItemProgress } from '@/progress';

import { setsDone, takeBaseline, tracedSince } from '../logic/sets';

const item = (attempts: number): ItemProgress => ({ best: [1, 0, 0], attempts, lastAt: attempts });
const keys = ['letter:a', 'letter:b', 'letter:c', 'letter:d', 'letter:e', 'letter:f'];

it('counts each letter once when it gets a new attempt after the baseline', () => {
  const before = { 'letter:a': item(2) };
  const baseline = takeBaseline(before, keys);
  expect(baseline['letter:a']).toBe(2);
  expect(baseline['letter:b']).toBe(0);
  expect(tracedSince(baseline, before, keys)).toBe(0);

  const after = { 'letter:a': item(5), 'letter:b': item(1), 'word:x': item(9) };
  expect(tracedSince(baseline, after, keys)).toBe(2);
});

it('makes a set every 5 traced letters', () => {
  expect(setsDone(0)).toBe(0);
  expect(setsDone(4)).toBe(0);
  expect(setsDone(5)).toBe(1);
  expect(setsDone(11)).toBe(2);
});
