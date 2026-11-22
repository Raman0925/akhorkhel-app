import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function HomeScreen(_props: ScreenProps<'Home'>) {
  return (
    <Screen testID="screen-Home">
      <Header title="Home" />
      <Text>Home</Text>
    </Screen>
  );
}
