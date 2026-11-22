export type StringTable<T extends Record<string, string>> = {
  as: T;
  en: { [K in keyof T]: string };
};

export function defineStrings<T extends Record<string, string>>(
  table: StringTable<T>,
): StringTable<T> {
  return table;
}
