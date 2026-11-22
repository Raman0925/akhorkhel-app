import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function RewardsScreen(_props: ScreenProps<'Rewards'>) {
  return (
    <Screen testID="screen-Rewards">
      <Header title="Rewards" />
      <Text>Rewards</Text>
    </Screen>
  );
}
