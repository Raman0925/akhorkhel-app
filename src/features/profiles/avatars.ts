import type { AvatarId } from '@/progress';

/** Avatars are drawn as emoji: friendly, original-free and tiny (no image assets). */
export const AVATAR_EMOJI: Record<AvatarId, string> = {
  rhino: '🦏',
  elephant: '🐘',
  deer: '🦌',
  dolphin: '🐬',
  hornbill: '🐦',
  tiger: '🐅',
  monkey: '🐒',
  fish: '🐟',
  butterfly: '🦋',
  tea: '🍵',
  dhol: '🥁',
  japi: '👒',
};

export function avatarEmoji(id: string): string {
  return AVATAR_EMOJI[id as AvatarId] ?? '🙂';
}
