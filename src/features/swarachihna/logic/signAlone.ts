const DOTTED_CIRCLE = '◌';

/** A vowel sign shown on its own sits on a dotted circle (e.g. ◌া), as in primers. */
export function signAlone(sign: string): string {
  return sign.startsWith(DOTTED_CIRCLE) ? sign : DOTTED_CIRCLE + sign;
}
