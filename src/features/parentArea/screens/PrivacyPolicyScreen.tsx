import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function PrivacyPolicyScreen(_props: ScreenProps<'PrivacyPolicy'>) {
  return (
    <Screen testID="screen-PrivacyPolicy">
      <Header title="PrivacyPolicy" />
      <Text>PrivacyPolicy</Text>
    </Screen>
  );
}
