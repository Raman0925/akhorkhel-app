/** Pure validation for AdMob IDs (used by tools/gen-ad-units.ts). */

/** Google's sample publisher: its IDs serve test ads only and must never ship as "release" IDs. */
export const GOOGLE_TEST_PUBLISHER = '3940256099942544';

const AD_UNIT_ID = /^ca-app-pub-(\d{16})\/(\d{10})$/;

export type AdUnitCheck = { ok: true; id: string } | { ok: false; error: string };

/** Validates an ad unit ID of the form `ca-app-pub-<16 digits>/<10 digits>`. */
export function checkAdUnitId(name: string, raw: string | undefined): AdUnitCheck {
  const id = (raw ?? '').trim();
  if (!id) {
    return { ok: false, error: `${name} is not set` };
  }
  const match = AD_UNIT_ID.exec(id);
  if (!match) {
    return {
      ok: false,
      error: `${name} must look like ca-app-pub-0000000000000000/0000000000 (an ad unit ID, not the app ID with "~")`,
    };
  }
  if (match[1] === GOOGLE_TEST_PUBLISHER) {
    return { ok: false, error: `${name} is a Google test ad unit; use the real AdMob unit` };
  }
  return { ok: true, id };
}
