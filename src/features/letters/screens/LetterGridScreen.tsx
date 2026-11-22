import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function LetterGridScreen(_props: ScreenProps<'LetterGrid'>) {
  return (
    <Screen testID="screen-LetterGrid">
      <Header title="LetterGrid" />
      <Text>LetterGrid</Text>
    </Screen>
  );
}
