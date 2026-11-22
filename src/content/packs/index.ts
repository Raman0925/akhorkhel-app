/**
 * Pack registry (frozen contract). Every pack shipped in the app is listed here; the release
 * validator fails the build if any listed pack is not `verified` (handover 5.1).
 * To add a language: add its folder, import it below, and run `npm run validate-packs`.
 */
import { buildPack } from '../loader';
import type { GeometryFile, Pack, PackContent } from '../schema';
import { PACK_ASSETS } from './assets.generated';

import asmBeng from './asm-beng/pack.json';
import asmBengGeometry from './asm-beng/geometry.json';
import brxDeva from './brx-deva/pack.json';
import brxDevaGeometry from './brx-deva/geometry.json';
import mrgLatn from './mrg-latn/pack.json';
import mrgLatnGeometry from './mrg-latn/geometry.json';

/** Assamese first: it is the main audience (handover 1.1). */
export const PACKS: readonly Pack[] = [
  buildPack(asmBeng as PackContent, asmBengGeometry as GeometryFile),
  buildPack(brxDeva as PackContent, brxDevaGeometry as GeometryFile),
  buildPack(mrgLatn as PackContent, mrgLatnGeometry as GeometryFile),
];

export const DEFAULT_PACK_ID = 'asm-beng';

export function getPack(id: string): Pack {
  return PACKS.find(p => p.id === id) ?? (PACKS[0] as Pack);
}

/** Bundled asset module for a pack-relative path (audio/... or images/...), if the file exists. */
export function packAsset(packId: string, path: string): number | undefined {
  return PACK_ASSETS[`${packId}/${path}`];
}
