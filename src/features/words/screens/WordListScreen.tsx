import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function WordListScreen(_props: ScreenProps<'WordList'>) {
  return (
    <Screen testID="screen-WordList">
      <Header title="WordList" />
      <Text>WordList</Text>
    </Screen>
  );
}
