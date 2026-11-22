/** Avatar emoji (features never import each other, so teacher keeps its own small map). */
const AVATAR_EMOJI: Record<string, string> = {
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
  return AVATAR_EMOJI[id] ?? '🙂';
}
