import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function GameHearScreen(_props: ScreenProps<'GameHear'>) {
  return (
    <Screen testID="screen-GameHear">
      <Header title="GameHear" />
      <Text>GameHear</Text>
    </Screen>
  );
}
