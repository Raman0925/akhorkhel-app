import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function ProfileEditScreen(_props: ScreenProps<'ProfileEdit'>) {
  return (
    <Screen testID="screen-ProfileEdit">
      <Header title="ProfileEdit" />
      <Text>ProfileEdit</Text>
    </Screen>
  );
}
