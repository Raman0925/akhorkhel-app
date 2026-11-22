import { useSettings } from '@/storage/settings';

import { audio, hasPackAudio, hasPrompt, promptAsset } from '..';
import { mockAudio } from '../testing';

beforeEach(() => useSettings.setState({ uiLanguage: 'en', soundOn: true }));

describe('audio availability', () => {
  it('reports everything missing when nothing is recorded (launch state)', () => {
    mockAudio('none');
    expect(hasPackAudio('asm-beng', 'audio/letters/a.m4a')).toBe(false);
    expect(hasPrompt('home')).toBe(false);
    expect(hasPrompt('home', 'as')).toBe(false);
  });

  it('finds recorded pack audio by pack and path', () => {
    mockAudio(['asm-beng/audio/letters/a.m4a']);
    expect(hasPackAudio('asm-beng', 'audio/letters/a.m4a')).toBe(true);
    expect(hasPackAudio('asm-beng', 'audio/letters/aa.m4a')).toBe(false);
    expect(hasPackAudio('brx-deva', 'audio/letters/a.m4a')).toBe(false);
  });

  it('uses the UI language and falls back to the Assamese prompt', () => {
    mockAudio(['as/home', 'en/great']);
    expect(hasPrompt('home')).toBe(true); // en missing -> as fallback
    expect(hasPrompt('great')).toBe(true);
    expect(hasPrompt('great', 'as')).toBe(false);
    expect(hasPrompt('welcome')).toBe(false);
    expect(promptAsset('home', 'en')).toBe(1);
  });

  it('playing missing audio is a silent no-op', async () => {
    mockAudio('none');
    await expect(audio.playPack('asm-beng', 'audio/letters/a.m4a')).resolves.toBeUndefined();
    await expect(audio.playPrompt('home')).resolves.toBeUndefined();
  });
});
