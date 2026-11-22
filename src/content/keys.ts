/** Item keys used for geometry and progress. Kept free of zod so the app bundle stays small. */
export const letterKey = (id: string) => `letter:${id}`;
export const signKey = (id: string) => `sign:${id}`;
export const numberKey = (value: number) => `number:${value}`;
