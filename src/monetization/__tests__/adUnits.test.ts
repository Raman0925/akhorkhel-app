import { TestIds } from 'react-native-google-mobile-ads';

import { checkAdUnitId } from '../logic/adUnitFormat';
import { AD_UNITS, resolveAdUnits, TEST_AD_UNITS } from '../adUnits';
import { GENERATED_AD_UNITS } from '../adUnits.generated';

const REAL = {
  banner: 'ca-app-pub-1234567890123456/1111111111',
  interstitial: 'ca-app-pub-1234567890123456/2222222222',
  rewarded: 'ca-app-pub-1234567890123456/3333333333',
};

describe('ad unit IDs', () => {
  it('the committed generated file holds no real IDs', () => {
    expect(GENERATED_AD_UNITS).toEqual({ banner: null, interstitial: null, rewarded: null });
  });

  it('debug builds always use Google test IDs', () => {
    expect(resolveAdUnits(true, REAL)).toEqual(TEST_AD_UNITS);
    expect(AD_UNITS).toEqual(TEST_AD_UNITS);
    expect(TEST_AD_UNITS.banner).toBe(TestIds.ADAPTIVE_BANNER);
  });

  it('release builds use generated IDs and fall back per placement', () => {
    expect(resolveAdUnits(false, REAL)).toEqual(REAL);
    expect(resolveAdUnits(false, { ...REAL, rewarded: null })).toEqual({
      ...REAL,
      rewarded: TEST_AD_UNITS.rewarded,
    });
  });

  it('validates the ca-app-pub-…/… format', () => {
    expect(checkAdUnitId('X', REAL.banner)).toEqual({ ok: true, id: REAL.banner });
    expect(checkAdUnitId('X', `  ${REAL.banner}\n`)).toEqual({ ok: true, id: REAL.banner });
    expect(checkAdUnitId('X', undefined).ok).toBe(false);
    expect(checkAdUnitId('X', '').ok).toBe(false);
    expect(checkAdUnitId('X', 'ca-app-pub-1234567890123456~1111111111').ok).toBe(false);
    expect(checkAdUnitId('X', 'ca-app-pub-123/456').ok).toBe(false);
    expect(checkAdUnitId('X', TEST_AD_UNITS.banner).ok).toBe(false);
  });
});
