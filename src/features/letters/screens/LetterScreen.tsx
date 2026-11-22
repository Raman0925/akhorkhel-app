import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function LetterScreen(_props: ScreenProps<'Letter'>) {
  return (
    <Screen testID="screen-Letter">
      <Header title="Letter" />
      <Text>Letter</Text>
    </Screen>
  );
}
