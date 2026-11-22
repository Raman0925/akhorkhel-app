import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function TeacherScreen(_props: ScreenProps<'Teacher'>) {
  return (
    <Screen testID="screen-Teacher">
      <Header title="Teacher" />
      <Text>Teacher</Text>
    </Screen>
  );
}
