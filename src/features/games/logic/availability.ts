import { packAsset, type Pack, type Word } from '@/content';

import { canPlayHear, canPlayPicture, pictureWords } from './rounds';

/** A word can be shown as a picture: bundled image or (draft packs) a placeholder emoji. */
export function hasPicture(packId: string, word: Word): boolean {
  return packAsset(packId, word.image) !== undefined || !!word.placeholderEmoji;
}

export function picturePool(pack: Pack): Word[] {
  return pictureWords(pack.words, pack.letters, w => hasPicture(pack.id, w));
}

/** Which games this pack has enough content for. Games without content are hidden. */
export function gameAvailability(pack: Pack): { hear: boolean; picture: boolean } {
  return {
    hear: canPlayHear(pack.letters),
    picture: canPlayPicture(picturePool(pack), pack.letters),
  };
}
