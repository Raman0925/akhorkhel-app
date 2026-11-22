import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function WordScreen(_props: ScreenProps<'Word'>) {
  return (
    <Screen testID="screen-Word">
      <Header title="Word" />
      <Text>Word</Text>
    </Screen>
  );
}
