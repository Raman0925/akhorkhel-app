import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function NumberScreen(_props: ScreenProps<'Number'>) {
  return (
    <Screen testID="screen-Number">
      <Header title="Number" />
      <Text>Number</Text>
    </Screen>
  );
}
