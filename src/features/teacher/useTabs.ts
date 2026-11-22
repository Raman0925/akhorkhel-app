import { useMemo, useState } from 'react';

import type { Pack } from '@/content';

import { TAB_IDS, tabColumns, type Column, type TabId } from './report';

/** Tabs the pack has content for, the selected tab and its columns. */
export function useTabs(pack: Pack) {
  const all = useMemo(
    () => TAB_IDS.map(id => ({ id, columns: tabColumns(pack, id) })).filter(t => t.columns.length),
    [pack],
  );
  const [selected, setSelected] = useState<TabId>('letters');
  const current = all.find(t => t.id === selected) ?? all[0];
  const columns: Column[] = current?.columns ?? [];
  return {
    tabs: all.map(t => t.id),
    all,
    tab: current?.id ?? selected,
    setTab: setSelected,
    columns,
  };
}
