/** Celebration sticker sets. All of them are free; a parent picks one in the parent area. */
export type StickerTheme = { id: string; emoji: readonly string[] };

export const STICKER_THEMES: readonly StickerTheme[] = [
  { id: 'stars', emoji: ['⭐', '🌟', '✨'] },
  { id: 'animals', emoji: ['🦏', '🐘', '🦌', '🐒', '🐟'] },
  { id: 'fruits', emoji: ['🥭', '🍌', '🍍', '🍊', '🍈'] },
  { id: 'festival', emoji: ['🥁', '🪔', '🎉', '🌸', '🎈'] },
];

export const DEFAULT_STICKER_THEME = STICKER_THEMES[0] as StickerTheme;

/** The theme with `id`, or stars for an unknown id. */
export function stickerTheme(id: string): StickerTheme {
  return STICKER_THEMES.find(t => t.id === id) ?? DEFAULT_STICKER_THEME;
}
