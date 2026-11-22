/**
 * Test stand-ins for the generated asset maps (`src/content/packs/assets.generated.ts`,
 * `src/audio/prompts.generated.ts`), installed in jest.setup.ts. The real maps are empty until
 * recordings are added, so tests choose which audio "exists":
 *
 *   mockAudio('all')   every pack .m4a and every voice prompt is bundled (default in each test)
 *   mockAudio('none')  no recordings at all (the launch state, ADR 0004)
 *   mockAudio([...])   only these keys: `<packId>/audio/...m4a` and/or `<lang>/<promptId>`
 *
 * Images are never mocked as present, so word pictures fall back to the placeholder emoji.
 */
type Mode = 'all' | 'none' | readonly string[];

let mode: Mode = 'all';

export function mockAudio(next: Mode): void {
  mode = next;
}

function present(key: string, isAudio: boolean): boolean {
  if (mode === 'all') {
    return isAudio;
  }
  if (mode === 'none') {
    return false;
  }
  return mode.includes(key);
}

function assetMap(isAudio: (key: string) => boolean): Record<string, number> {
  return new Proxy({} as Record<string, number>, {
    get: (_target, key) => (typeof key === 'string' && present(key, isAudio(key)) ? 1 : undefined),
  });
}

export const PACK_ASSETS = assetMap(key => key.endsWith('.m4a'));
export const PROMPT_ASSETS = assetMap(() => true);
