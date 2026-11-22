import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function StrokeRecorderScreen(_props: ScreenProps<'StrokeRecorder'>) {
  return (
    <Screen testID="screen-StrokeRecorder">
      <Header title="StrokeRecorder" />
      <Text>StrokeRecorder</Text>
    </Screen>
  );
}
