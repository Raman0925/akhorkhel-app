import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function ParentAreaScreen(_props: ScreenProps<'ParentArea'>) {
  return (
    <Screen testID="screen-ParentArea">
      <Header title="ParentArea" />
      <Text>ParentArea</Text>
    </Screen>
  );
}
