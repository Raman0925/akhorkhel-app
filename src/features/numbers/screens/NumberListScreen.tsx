import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function NumberListScreen(_props: ScreenProps<'NumberList'>) {
  return (
    <Screen testID="screen-NumberList">
      <Header title="NumberList" />
      <Text>NumberList</Text>
    </Screen>
  );
}
