/**
 * Tiny typed i18n (frozen contract, owner A1). No library: each feature owns its own strings file
 * (`features/<x>/strings.ts`) so agents never conflict on one big JSON file.
 *
 *   export const strings = defineStrings({ as: { title: 'আখৰ' }, en: { title: 'Letters' } });
 *   const s = useStrings(strings); <Text>{s.title}</Text>
 *
 * Every Assamese string must be reviewed by a native speaker before release (docs/CONTENT_GUIDE.md).
 */
import { useSettings, type UiLanguage } from '@/storage/settings';

import type { StringTable } from './define';

export { defineStrings, type StringTable } from './define';

export function useStrings<T extends Record<string, string>>(table: StringTable<T>): T {
  const lang = useSettings(s => s.uiLanguage);
  return table[lang] as T;
}

/** Non-hook access (e.g. building a PDF report). */
export function stringsFor<T extends Record<string, string>>(
  table: StringTable<T>,
  lang: UiLanguage,
): T {
  return table[lang] as T;
}

/** Replace {name} placeholders. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? String(values[key]) : m,
  );
}

export { common } from './common';
