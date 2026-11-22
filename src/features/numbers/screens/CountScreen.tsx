import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function CountScreen(_props: ScreenProps<'Count'>) {
  return (
    <Screen testID="screen-Count">
      <Header title="Count" />
      <Text>Count</Text>
    </Screen>
  );
}
