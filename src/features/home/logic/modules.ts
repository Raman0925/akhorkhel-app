import type { Pack } from '@/content';
import type { RootStackParamList } from '@/navigation';

export type ModuleId = 'letters' | 'signs' | 'games' | 'words' | 'numbers';

export type HomeModule = {
  id: ModuleId;
  icon: string;
  route: Extract<
    keyof RootStackParamList,
    'LetterGrid' | 'SignList' | 'GamesHub' | 'WordList' | 'NumberList'
  >;
};

const ALL: readonly HomeModule[] = [
  { id: 'letters', icon: '🔤', route: 'LetterGrid' },
  { id: 'signs', icon: '✨', route: 'SignList' },
  { id: 'games', icon: '🎲', route: 'GamesHub' },
  { id: 'words', icon: '🖼️', route: 'WordList' },
  { id: 'numbers', icon: '🔢', route: 'NumberList' },
];

/**
 * Modules with content in this pack. Empty modules are hidden, never shown as "coming soon".
 * Games need at least two letters that look different (every sound game is built on letters).
 * Words need at least one word the child can open (bonus words only while unlocked).
 */
export function visibleModules(pack: Pack, bonusWordsOpen: boolean): HomeModule[] {
  const has: Record<ModuleId, boolean> = {
    letters: pack.letters.length > 0,
    signs: pack.signs.length > 0,
    games: new Set(pack.letters.map(l => l.glyph)).size >= 2,
    words: pack.words.some(w => !w.bonus || bonusWordsOpen),
    numbers: pack.numbers.length > 0,
  };
  return ALL.filter(m => has[m.id]);
}
