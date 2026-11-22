import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function GamesHubScreen(_props: ScreenProps<'GamesHub'>) {
  return (
    <Screen testID="screen-GamesHub">
      <Header title="GamesHub" />
      <Text>GamesHub</Text>
    </Screen>
  );
}
