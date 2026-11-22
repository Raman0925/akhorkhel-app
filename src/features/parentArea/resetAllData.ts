import { useProfiles, useProgress } from '@/progress';
import { clearAllData, DEFAULT_SETTINGS, useSettings } from '@/storage';

import { resetAdsState } from '@/monetization';

/**
 * Parent area → delete all data. Wipes the device store, then resets the in-memory stores
 * (settings, profiles, progress, ad counters and unlocks) so the app behaves like a fresh install
 * without a restart.
 */
export function resetAllData(): void {
  clearAllData();
  resetAdsState();
  useProgress.setState({ progress: {} });
  useProfiles.setState({ profiles: [], currentId: null });
  useSettings.setState({ ...DEFAULT_SETTINGS });
}
