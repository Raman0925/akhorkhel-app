import { hasPackAudio } from '@/audio';
import { packAsset, type Letter, type Pack, type Word } from '@/content';

import { canPlayHear, canPlayPicture, pictureWords } from './rounds';

/** A word can be shown as a picture: bundled image or (draft packs) a placeholder emoji. */
export function hasPicture(packId: string, word: Word): boolean {
  return packAsset(packId, word.image) !== undefined || !!word.placeholderEmoji;
}

export function picturePool(pack: Pack): Word[] {
  return pictureWords(pack.words, pack.letters, w => hasPicture(pack.id, w));
}

/**
 * Letters whose sound is bundled. Both games are built on hearing a letter, so they only ask about
 * these (recordings are optional, ADR 0004).
 */
export function audibleLetters(pack: Pack): Letter[] {
  return pack.letters.filter(l => hasPackAudio(pack.id, l.audio));
}

/**
 * Which games this pack has enough content and letter audio for. Games that cannot be played are
 * hidden. Keep in sync with `gamesPlayable` in features/home/logic/modules.ts.
 */
export function gameAvailability(pack: Pack): { hear: boolean; picture: boolean } {
  const letters = audibleLetters(pack);
  return {
    hear: canPlayHear(letters),
    picture: canPlayPicture(picturePool(pack), letters),
  };
}
