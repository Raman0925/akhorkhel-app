import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function ProfilePickerScreen(_props: ScreenProps<'ProfilePicker'>) {
  return (
    <Screen testID="screen-ProfilePicker">
      <Header title="ProfilePicker" />
      <Text>ProfilePicker</Text>
    </Screen>
  );
}
