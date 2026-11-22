/** Celebration sticker sets. `stars` is always free; the others unlock for 24 h via a rewarded ad. */
export type StickerTheme = { id: string; emoji: readonly string[]; free: boolean };

export const STICKER_THEMES: readonly StickerTheme[] = [
  { id: 'stars', emoji: ['⭐', '🌟', '✨'], free: true },
  { id: 'animals', emoji: ['🦏', '🐘', '🦌', '🐒', '🐟'], free: false },
  { id: 'fruits', emoji: ['🥭', '🍌', '🍍', '🍊', '🍈'], free: false },
  { id: 'festival', emoji: ['🥁', '🪔', '🎉', '🌸', '🎈'], free: false },
];

export const FREE_STICKER_THEME = STICKER_THEMES[0] as StickerTheme;
