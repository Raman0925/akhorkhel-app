import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function ParentGateScreen(_props: ScreenProps<'ParentGate'>) {
  return (
    <Screen testID="screen-ParentGate">
      <Header title="ParentGate" />
      <Text>ParentGate</Text>
    </Screen>
  );
}
