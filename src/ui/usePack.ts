import { getPack, type Pack } from '@/content';
import { useSettings } from '@/storage/settings';

/** The language pack the child is currently learning. */
export function usePack(): Pack {
  const packId = useSettings(s => s.packId);
  return getPack(packId);
}
