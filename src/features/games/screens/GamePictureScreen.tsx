import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function GamePictureScreen(_props: ScreenProps<'GamePicture'>) {
  return (
    <Screen testID="screen-GamePicture">
      <Header title="GamePicture" />
      <Text>GamePicture</Text>
    </Screen>
  );
}
