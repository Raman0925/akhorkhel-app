/** Manual mock of react-native-audio-api: decoding resolves, playback is a no-op. */
import { jest } from '@jest/globals';

export class AudioContext {
  destination = {};
  currentTime = 0;
  createBufferSource = jest.fn(() => ({
    buffer: null as unknown,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onEnded: null as null | (() => void),
  }));
  createOscillator = jest.fn(() => ({
    type: 'sine',
    frequency: { value: 0 },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }));
  createGain = jest.fn(() => ({
    gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
    connect: jest.fn(),
  }));
  decodeAudioData = jest.fn(async () => ({ duration: 1 }));
  close = jest.fn(async () => undefined);
  suspend = jest.fn(async () => undefined);
  resume = jest.fn(async () => undefined);
}

export const decodeAudioData = jest.fn(async () => ({ duration: 1 }));
