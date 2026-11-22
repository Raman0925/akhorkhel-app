import type { Pack, Traceable } from '@/content';
import type { ItemProgress, TraceLevel } from '@/progress';

/** Every traceable item of a pack, in pack order: letters, then vowel signs, then numbers. */
export function packTraceables(pack: Pack): Traceable[] {
  return [...pack.letters, ...pack.signs, ...pack.numbers];
}

export function findTraceable(pack: Pack, itemKey: string): Traceable | undefined {
  return packTraceables(pack).find(t => t.key === itemKey);
}

/** Does the item have geometry the canvas can trace? (Draft packs may not yet.) */
export function isTraceReady(item: Traceable | undefined): boolean {
  return !!item && item.strokes.length > 0 && item.strokes.every(s => s.points.length >= 2);
}

/** The lowest level the child has not yet earned 3 stars on (3 once everything is mastered). */
export function startLevel(progress: ItemProgress | undefined): TraceLevel {
  if (!progress || progress.best[0] < 3) {
    return 1;
  }
  return progress.best[1] < 3 ? 2 : 3;
}
