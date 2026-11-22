/**
 * Which recorded audio is bundled. Recordings are optional (ADR 0004): the app launches without
 * them, and every speaker / replay / listen button is hidden while its file is missing. Dropping
 * `.m4a` files into the pack or prompt folders and running `npm run gen:assets` makes them play
 * (and the buttons appear) with no code change.
 */
import { packAsset } from '@/content/packs';
import { useSettings, type UiLanguage } from '@/storage/settings';

import { PROMPT_ASSETS } from './prompts.generated';
import type { PromptId } from './prompts';

/** Bundled prompt in `lang` (default: the UI language), falling back to the Assamese recording. */
export function promptAsset(
  id: PromptId,
  lang: UiLanguage = useSettings.getState().uiLanguage,
): number | undefined {
  return PROMPT_ASSETS[`${lang}/${id}`] ?? PROMPT_ASSETS[`as/${id}`];
}

/** True when `audio.playPrompt(id)` would play something in `lang` (default: the UI language). */
export function hasPrompt(id: PromptId, lang?: UiLanguage): boolean {
  return promptAsset(id, lang) !== undefined;
}

/** True when `audio.playPack(packId, path)` would play something. */
export function hasPackAudio(packId: string, path: string): boolean {
  return packAsset(packId, path) !== undefined;
}

/** Hook form of `hasPrompt`: re-renders when the UI language changes. */
export function usePromptAvailable(id: PromptId | undefined): boolean {
  const lang = useSettings(s => s.uiLanguage);
  return id !== undefined && hasPrompt(id, lang);
}
