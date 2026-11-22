import { FIXTURE_PACK } from '../testing/fixturePack';
import { findTraceable, isTraceReady, packTraceables, startLevel } from '../traceables';

it('lists and finds traceables by key', () => {
  expect(packTraceables(FIXTURE_PACK).map(t => t.key)).toEqual([
    'letter:plus',
    'letter:empty',
    'number:1',
  ]);
  expect(findTraceable(FIXTURE_PACK, 'number:1')?.display).toBe('1');
  expect(findTraceable(FIXTURE_PACK, 'letter:nope')).toBeUndefined();
});

it('knows which items have geometry', () => {
  expect(isTraceReady(findTraceable(FIXTURE_PACK, 'letter:plus'))).toBe(true);
  expect(isTraceReady(findTraceable(FIXTURE_PACK, 'letter:empty'))).toBe(false);
  expect(isTraceReady(undefined)).toBe(false);
});

it('starts at the lowest level without 3 stars', () => {
  const p = (best: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]) => ({
    best,
    attempts: 1,
    lastAt: 0,
  });
  expect(startLevel(undefined)).toBe(1);
  expect(startLevel(p([2, 0, 0]))).toBe(1);
  expect(startLevel(p([3, 1, 0]))).toBe(2);
  expect(startLevel(p([3, 3, 0]))).toBe(3);
  expect(startLevel(p([3, 3, 3]))).toBe(3);
});
