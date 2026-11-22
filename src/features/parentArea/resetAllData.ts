import { useProfiles, useProgress } from '@/progress';
import { clearAllData, DEFAULT_SETTINGS, useSettings } from '@/storage';

/**
 * Parent area → delete all data. Wipes the device store, then resets the in-memory stores so the
 * app behaves like a fresh install without a restart.
 */
export function resetAllData(): void {
  clearAllData();
  useProgress.setState({ progress: {} });
  useProfiles.setState({ profiles: [], currentId: null });
  useSettings.setState({ ...DEFAULT_SETTINGS });
}
