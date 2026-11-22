import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

// Integration test of the real first-launch flow; production code never imports across features.
import { ParentAreaScreen, PrivacyPolicyScreen } from '@/features/parentArea';
import { ParentGateScreen } from '@/features/parentGate';
import type { RootStackParamList } from '@/navigation';
import { useProfiles } from '@/progress';
import { DEFAULT_SETTINGS, useSettings } from '@/storage';

import { OnboardingScreen } from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Home() {
  return <Text testID="screen-Home">home</Text>;
}

async function renderOnboarding() {
  await render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="ParentGate" component={ParentGateScreen} />
        <Stack.Screen name="ParentArea" component={ParentAreaScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await screen.findByTestId('screen-Onboarding');
}

async function passGate() {
  await screen.findByTestId('screen-ParentGate');
  const question = String(screen.getByTestId('parent-gate-question').props.children);
  const [, a, b] = /(\d+) × (\d+)/.exec(question)!;
  for (const d of String(Number(a) * Number(b))) {
    await fireEvent.press(screen.getByTestId(`parent-gate-key-${d}`));
  }
  await fireEvent.press(screen.getByTestId('parent-gate-submit'));
}

beforeEach(() => {
  useSettings.setState({ ...DEFAULT_SETTINGS });
  useProfiles.setState({ profiles: [], currentId: null });
});

it('runs the whole first launch: language → gate → notice → first child → Home', async () => {
  await renderOnboarding();

  // Step 1: Assamese UI by default, one card per pack.
  expect(screen.getByText('কোনটো ভাষা শিকিব?')).toBeTruthy();
  expect(screen.getByTestId('onboarding-pack-asm-beng')).toBeTruthy();
  expect(screen.getByTestId('onboarding-pack-brx-deva')).toBeTruthy();
  expect(screen.getByTestId('onboarding-pack-brx-deva')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('onboarding-ui-en'));
  expect(screen.getByText('Which language will your child learn?')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('onboarding-pack-brx-deva'));
  expect(useSettings.getState().packId).toBe('brx-deva');
  await fireEvent.press(screen.getByTestId('onboarding-pack-asm-beng'));
  await fireEvent.press(screen.getByTestId('onboarding-continue'));

  // Step 2: grown-up passes the gate and accepts the ads & privacy notice.
  await fireEvent.press(screen.getByTestId('onboarding-grownup'));
  await passGate();
  expect(await screen.findByTestId('ads-notice-content')).toBeTruthy();
  expect(screen.getByText(/non-personalised/)).toBeTruthy();
  expect(screen.queryByTestId('banner-slot')).toBeNull();
  await fireEvent.press(screen.getByTestId('ads-notice-accept'));
  expect(useSettings.getState().adsNoticeSeen).toBe(true);

  // Step 3: first child profile.
  expect(await screen.findByTestId('profile-nickname')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('profile-nickname'), '  Minu  ');
  await fireEvent.press(screen.getByTestId('avatar-elephant'));
  await fireEvent.press(screen.getByTestId('profile-save'));

  expect(await screen.findByTestId('screen-Home')).toBeTruthy();
  const { profiles, currentId } = useProfiles.getState();
  expect(profiles).toHaveLength(1);
  expect(profiles[0]).toMatchObject({ nickname: 'Minu', avatar: 'elephant' });
  expect(currentId).toBe(profiles[0]?.id);
  expect(useSettings.getState()).toMatchObject({ onboarded: true, packId: 'asm-beng' });
});

it('does not save a profile without a nickname', async () => {
  useSettings.setState({ adsNoticeSeen: true });
  await renderOnboarding();
  await fireEvent.press(screen.getByTestId('onboarding-continue'));
  await fireEvent.changeText(screen.getByTestId('profile-nickname'), '   ');
  await fireEvent.press(screen.getByTestId('profile-save'));
  expect(useProfiles.getState().profiles).toHaveLength(0);
  expect(screen.queryByTestId('screen-Home')).toBeNull();
});

it('opens the privacy policy from the notice', async () => {
  useSettings.setState({ uiLanguage: 'en' });
  await renderOnboarding();
  await fireEvent.press(screen.getByTestId('onboarding-continue'));
  await fireEvent.press(screen.getByTestId('onboarding-grownup'));
  await passGate();
  await fireEvent.press(await screen.findByTestId('ads-notice-policy'));
  expect(await screen.findByTestId('privacy-url')).toHaveTextContent(
    'https://raman0925.github.io/akhorkhel-privacy/',
  );
});
