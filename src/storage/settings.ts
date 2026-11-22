/**
 * App settings store (frozen contract, owner A1). Persisted locally with MMKV.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from './mmkv';

export type UiLanguage = 'as' | 'en';

export type SettingsState = {
  /** Written interface language (voice prompts follow it). Assamese is the default. */
  uiLanguage: UiLanguage;
  /** Language pack the child is learning. */
  packId: string;
  leftHanded: boolean;
  soundOn: boolean;
  /** First-launch flow (language pick) finished. */
  onboarded: boolean;
  /** Parent has seen the ads/privacy notice (behind the parent gate). */
  adsNoticeSeen: boolean;
  /** Completed learning sessions; used for the 3rd-session review prompt and first-session ad skip. */
  completedSessions: number;
  reviewRequested: boolean;
  /** Sticker theme the parent picked in the parent area (see monetization STICKER_THEMES). */
  stickerTheme: string;
  setUiLanguage: (l: UiLanguage) => void;
  setPackId: (id: string) => void;
  setLeftHanded: (v: boolean) => void;
  setSoundOn: (v: boolean) => void;
  completeOnboarding: () => void;
  markAdsNoticeSeen: () => void;
  incrementSessions: () => void;
  markReviewRequested: () => void;
  setStickerTheme: (id: string) => void;
};

export const DEFAULT_SETTINGS = {
  uiLanguage: 'as' as UiLanguage,
  packId: 'asm-beng',
  leftHanded: false,
  soundOn: true,
  onboarded: false,
  adsNoticeSeen: false,
  completedSessions: 0,
  reviewRequested: false,
  stickerTheme: 'stars',
};

export const useSettings = create<SettingsState>()(
  persist(
    set => ({
      ...DEFAULT_SETTINGS,
      setUiLanguage: uiLanguage => set({ uiLanguage }),
      setPackId: packId => set({ packId }),
      setLeftHanded: leftHanded => set({ leftHanded }),
      setSoundOn: soundOn => set({ soundOn }),
      completeOnboarding: () => set({ onboarded: true }),
      markAdsNoticeSeen: () => set({ adsNoticeSeen: true }),
      incrementSessions: () => set(s => ({ completedSessions: s.completedSessions + 1 })),
      markReviewRequested: () => set({ reviewRequested: true }),
      setStickerTheme: stickerTheme => set({ stickerTheme }),
    }),
    { name: STORAGE_KEYS.settings, storage: zustandStorage, version: 1 },
  ),
);
