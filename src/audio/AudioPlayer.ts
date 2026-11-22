/**
 * AudioPlayer (frozen contract, owner A3). Plays pre-recorded, bundled audio only; sound effects are
 * synthesised (no extra asset files, no licensing). Never throws: a missing or broken file is silent,
 * so lessons never break or wait on audio. Recordings are optional (ADR 0004): screens use
 * `hasPackAudio` / `hasPrompt` (./assets) to hide speaker buttons whose file is not bundled.
 *
 *   audio.playPack(pack.id, letter.audio)  // letter / word / number audio
 *   audio.playPrompt('traceStart')         // voice prompt in the UI language
 *   audio.sfx('success')                   // chime
 */
import { AudioContext } from 'react-native-audio-api';

import { packAsset } from '@/content/packs';
import { useSettings } from '@/storage/settings';

import { promptAsset } from './assets';
import type { PromptId } from './prompts';

export type Sfx = 'tap' | 'success' | 'star' | 'pop';

type Source = { stop: (when?: number) => void };
type DecodedBuffer = Awaited<ReturnType<AudioContext['decodeAudioData']>>;

class Player {
  private ctx: AudioContext | null = null;
  private cache = new Map<number, Promise<DecodedBuffer | null>>();
  private current: Source | null = null;

  private context(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch (e) {
        console.warn('[audio] no audio context', e);
        return null;
      }
    }
    return this.ctx;
  }

  private enabled(): boolean {
    return useSettings.getState().soundOn;
  }

  private decode(asset: number): Promise<DecodedBuffer | null> {
    let p = this.cache.get(asset);
    if (!p) {
      const ctx = this.context();
      p = ctx
        ? ctx.decodeAudioData(asset).catch(e => {
            console.warn('[audio] decode failed', e);
            return null;
          })
        : Promise.resolve(null);
      this.cache.set(asset, p);
    }
    return p;
  }

  /** Play a bundled asset module, stopping whatever voice is playing. Resolves when playback starts. */
  async playAsset(asset: number | undefined): Promise<void> {
    if (asset === undefined || !this.enabled()) {
      return;
    }
    const ctx = this.context();
    const buffer = await this.decode(asset);
    if (!ctx || !buffer) {
      return;
    }
    this.stop();
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
      this.current = src;
    } catch (e) {
      console.warn('[audio] play failed', e);
    }
  }

  playPack(packId: string, path: string): Promise<void> {
    return this.playAsset(packAsset(packId, path));
  }

  playPrompt(id: PromptId): Promise<void> {
    return this.playAsset(promptAsset(id));
  }

  /** Warm the decode cache (e.g. a letter grid's audio) so the first tap is instant. */
  async preload(assets: (number | undefined)[]): Promise<void> {
    await Promise.all(assets.filter((a): a is number => a !== undefined).map(a => this.decode(a)));
  }

  stop(): void {
    try {
      this.current?.stop();
    } catch {
      // already stopped
    }
    this.current = null;
  }

  /** Short synthesised effects: a few sine notes with a soft envelope. */
  sfx(kind: Sfx): void {
    if (!this.enabled()) {
      return;
    }
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    const notes: Record<Sfx, number[]> = {
      tap: [660],
      pop: [880],
      star: [784, 1047],
      success: [523, 659, 784, 1047],
    };
    try {
      const step = kind === 'success' ? 0.11 : 0.08;
      notes[kind].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * step;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + step * 2);
      });
    } catch (e) {
      console.warn('[audio] sfx failed', e);
    }
  }
}

export const audio = new Player();
