import React from 'react';
import { Text } from 'react-native';

import type { ScreenProps } from '@/navigation';
import { Header, Screen } from '@/ui';

/** Scaffold placeholder: replaced by the owning agent. Must not ship. */
export function OnboardingScreen(_props: ScreenProps<'Onboarding'>) {
  return (
    <Screen testID="screen-Onboarding">
      <Header title="Onboarding" />
      <Text>Onboarding</Text>
    </Screen>
  );
}
