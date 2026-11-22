import { act } from '@testing-library/react-native';

import { applyAttempt, bestStars, MAX_PROFILES, useProfiles, useProgress } from '@/progress';

describe('applyAttempt', () => {
  it('keeps the best stars per level and counts attempts', () => {
    const a = applyAttempt(undefined, 1, 2, 10);
    const b = applyAttempt(a, 1, 1, 20);
    const c = applyAttempt(b, 3, 3, 30);
    expect(c.best).toEqual([2, 0, 3]);
    expect(c.attempts).toBe(3);
    expect(c.lastAt).toBe(30);
    expect(bestStars(c)).toBe(3);
    expect(bestStars(undefined)).toBe(0);
  });
});

describe('useProgress', () => {
  it('records per profile and pack, and clears a profile', async () => {
    await act(() => useProgress.getState().record('p1', 'asm-beng', 'letter:a', 2, 3));
    expect(useProgress.getState().progress.p1?.['asm-beng']?.['letter:a']?.best).toEqual([0, 3, 0]);
    await act(() => useProgress.getState().clearProfile('p1'));
    expect(useProgress.getState().progress.p1).toBeUndefined();
  });
});

describe('useProfiles', () => {
  beforeEach(async () => await act(() => useProfiles.setState({ profiles: [], currentId: null })));

  it('adds, selects, renames and removes profiles', async () => {
    const a = useProfiles.getState().addProfile('  Mina  ', 'rhino');
    const b = useProfiles.getState().addProfile('Bitu', 'deer');
    expect(a?.nickname).toBe('Mina');
    expect(useProfiles.getState().currentId).toBe(a?.id);
    await act(() => useProfiles.getState().selectProfile(b!.id));
    expect(useProfiles.getState().currentId).toBe(b?.id);
    await act(() => useProfiles.getState().updateProfile(b!.id, { nickname: '   ' }));
    expect(useProfiles.getState().profiles[1]?.nickname).toBe('Bitu');
    await act(() => useProfiles.getState().removeProfile(b!.id));
    expect(useProfiles.getState().currentId).toBe(a?.id);
  });

  it('rejects empty nicknames and enforces the 40-profile limit', () => {
    expect(useProfiles.getState().addProfile('  ', 'rhino')).toBeNull();
    for (let i = 0; i < MAX_PROFILES; i++) {
      useProfiles.getState().addProfile(`c${i}`, 'fish');
    }
    expect(useProfiles.getState().addProfile('extra', 'fish')).toBeNull();
    expect(useProfiles.getState().profiles).toHaveLength(MAX_PROFILES);
  });
});
