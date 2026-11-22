import { hasPackAudio } from '@/audio';
import { packAsset, type Pack } from '@/content';
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

/** Choices in the picture game (features/games/logic/rounds.ts PICTURE_CHOICES). */
const PICTURE_CHOICES = 3;

/**
 * True when at least one sound game can be played. Both games are built on hearing a letter, so
 * they need recorded letter audio (ADR 0004). Mirrors `gameAvailability` in
 * features/games/logic/availability.ts (features do not import each other); keep them in sync.
 *   - "Tap the letter you hear": two audible letters that look different.
 *   - "Which picture starts with": an audible letter with a pictured word starting with it, and
 *     enough other pictured words for the distractors.
 */
export function gamesPlayable(pack: Pack): boolean {
  const audible = pack.letters.filter(l => hasPackAudio(pack.id, l.audio));
  if (new Set(audible.map(l => l.glyph)).size >= 2) {
    return true;
  }
  const letterIds = new Set(pack.letters.map(l => l.id));
  const pictured = pack.words.filter(
    w =>
      w.startsWith !== undefined &&
      letterIds.has(w.startsWith) &&
      (packAsset(pack.id, w.image) !== undefined || !!w.placeholderEmoji),
  );
  return audible.some(l => {
    const starting = pictured.filter(w => w.startsWith === l.id).length;
    return starting >= 1 && pictured.length - starting >= PICTURE_CHOICES - 1;
  });
}

/** Modules with content in this pack. Empty modules are hidden, never teased as future content. */
export function visibleModules(pack: Pack): HomeModule[] {
  const has: Record<ModuleId, boolean> = {
    letters: pack.letters.length > 0,
    signs: pack.signs.length > 0,
    games: gamesPlayable(pack),
    words: pack.words.length > 0,
    numbers: pack.numbers.length > 0,
  };
  return ALL.filter(m => has[m.id]);
}
