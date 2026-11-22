/**
 * Child profiles (frozen contract, owner A0; UI by A5). Up to 40 local profiles (a class).
 * A profile is only a nickname + avatar id. No real names, photos, ages or anything else.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from '@/storage/mmkv';

export const MAX_PROFILES = 40;
export const MAX_NICKNAME_LENGTH = 20;

/** Avatar ids map to original artwork in features/profiles. */
export const AVATARS = [
  'rhino',
  'elephant',
  'deer',
  'dolphin',
  'hornbill',
  'tiger',
  'monkey',
  'fish',
  'butterfly',
  'tea',
  'dhol',
  'japi',
] as const;
export type AvatarId = (typeof AVATARS)[number];

export type Profile = { id: string; nickname: string; avatar: AvatarId; createdAt: number };

type ProfilesState = {
  profiles: Profile[];
  currentId: string | null;
  /** Returns the new profile, or null if the limit is reached or the nickname is empty. */
  addProfile: (nickname: string, avatar: AvatarId) => Profile | null;
  updateProfile: (id: string, patch: Partial<Pick<Profile, 'nickname' | 'avatar'>>) => void;
  removeProfile: (id: string) => void;
  selectProfile: (id: string) => void;
};

let counter = 0;
const newId = () => 'p' + Date.now().toString(36) + (counter++).toString(36);

export function cleanNickname(nickname: string): string {
  return nickname.trim().slice(0, MAX_NICKNAME_LENGTH);
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      currentId: null,
      addProfile: (nickname, avatar) => {
        const clean = cleanNickname(nickname);
        if (!clean || get().profiles.length >= MAX_PROFILES) {
          return null;
        }
        const profile: Profile = { id: newId(), nickname: clean, avatar, createdAt: Date.now() };
        set(s => ({ profiles: [...s.profiles, profile], currentId: s.currentId ?? profile.id }));
        return profile;
      },
      updateProfile: (id, patch) =>
        set(s => ({
          profiles: s.profiles.map(p => {
            if (p.id !== id) {
              return p;
            }
            const nickname =
              patch.nickname === undefined
                ? p.nickname
                : cleanNickname(patch.nickname) || p.nickname;
            return { ...p, avatar: patch.avatar ?? p.avatar, nickname };
          }),
        })),
      removeProfile: id =>
        set(s => {
          const profiles = s.profiles.filter(p => p.id !== id);
          const currentId = s.currentId === id ? (profiles[0]?.id ?? null) : s.currentId;
          return { profiles, currentId };
        }),
      selectProfile: id => {
        if (get().profiles.some(p => p.id === id)) {
          set({ currentId: id });
        }
      },
    }),
    { name: STORAGE_KEYS.profiles, storage: zustandStorage, version: 1 },
  ),
);

export function useCurrentProfile(): Profile | null {
  return useProfiles(s => s.profiles.find(p => p.id === s.currentId) ?? null);
}
