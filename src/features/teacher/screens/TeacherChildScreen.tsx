import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function TeacherChildScreen(_props: ScreenProps<'TeacherChild'>) {
  return (
    <Screen testID="screen-TeacherChild">
      <Header title="TeacherChild" />
      <Text>TeacherChild</Text>
    </Screen>
  );
}
