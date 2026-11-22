import { fonts } from './tokens';

/** Font family for a pack script (Beng/Deva/Latn). */
export function fontForScript(script: 'Beng' | 'Deva' | 'Latn', bold = false): string {
  switch (script) {
    case 'Beng':
      return bold ? fonts.bengaliBold : fonts.bengali;
    case 'Deva':
      return bold ? fonts.devanagariBold : fonts.devanagari;
    case 'Latn':
      return bold ? fonts.latinBold : fonts.latin;
  }
}
