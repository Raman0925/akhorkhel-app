/**
 * Design tokens. Bright, calm colours; big touch targets (handover section 8).
 * Frozen contract: add tokens, never rename or remove them without an ADR.
 */
export const colors = {
  background: '#FFF8EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FDEFD6',
  primary: '#E2574C', // gamosa red
  primaryDark: '#B8433A',
  onPrimary: '#FFFFFF',
  secondary: '#2E8B57', // tea-leaf green
  onSecondary: '#FFFFFF',
  accent: '#F4B400', // star gold
  sky: '#4A90D9',
  text: '#2B2118',
  textMuted: '#6B5E52',
  border: '#E8D9C2',
  guide: '#C9B8A3', // faint letter / dashed guide on the tracing canvas
  ink: '#3A6FD8', // child's tracing ink
  inkGood: '#2E8B57',
  startDot: '#2E8B57',
  arrow: '#E2574C',
  bannerPlaceholder: '#F3E6D0',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 8, md: 16, lg: 24, pill: 999 } as const;

/** Minimum touch target for children (dp). Every tappable element must be at least this big. */
export const MIN_TOUCH = 64;

/** Height reserved at the bottom of menu screens so the UI never jumps when a banner loads. */
export const BANNER_HEIGHT = 60;

export const fonts = {
  /** UI font that covers Assamese (incl. ৰ ৱ) and Latin. */
  bengali: 'NotoSansBengali-Regular',
  bengaliBold: 'NotoSansBengali-Bold',
  devanagari: 'NotoSansDevanagari-Regular',
  devanagariBold: 'NotoSansDevanagari-Bold',
  latin: 'NotoSans-Regular',
  latinBold: 'NotoSans-Bold',
} as const;

export const fontSize = { sm: 16, md: 20, lg: 26, xl: 34, hero: 120 } as const;

export type Colors = typeof colors;
