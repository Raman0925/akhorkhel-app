import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import type { RootStackParamList } from '@/navigation';
import { MAX_PROFILES, useProfiles, useProgress, type Profile } from '@/progress';
import { DEFAULT_SETTINGS, useSettings } from '@/storage';

import { ProfileEditScreen } from '../screens/ProfileEditScreen';
import { ProfilePickerScreen } from '../screens/ProfilePickerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Stub = (id: string) =>
  function StubScreen() {
    return <Text testID={id}>{id}</Text>;
  };
const Home = Stub('screen-Home');
const Onboarding = Stub('screen-Onboarding');

async function renderStack(
  initial: keyof RootStackParamList,
  params?: RootStackParamList['ProfileEdit'],
) {
  await render(
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initial}>
        <Stack.Screen name="ProfilePicker" component={ProfilePickerScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} initialParams={params} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Onboarding" component={Onboarding} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

const make = (n: number): Profile[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    nickname: `Kid ${i}`,
    avatar: 'tiger',
    createdAt: i,
  }));

beforeEach(() => {
  useSettings.setState({ ...DEFAULT_SETTINGS, uiLanguage: 'en', onboarded: true });
  useProgress.setState({ progress: {} });
});

it('picks a profile and goes Home', async () => {
  useProfiles.setState({ profiles: make(3), currentId: 'p0' });
  await renderStack('ProfilePicker');
  expect(screen.getByText('Kid 2')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('profile-tile-p2'));
  expect(await screen.findByTestId('screen-Home')).toBeTruthy();
  expect(useProfiles.getState().currentId).toBe('p2');
});

it('adds a child from the picker', async () => {
  useProfiles.setState({ profiles: make(1), currentId: 'p0' });
  await renderStack('ProfilePicker');
  await fireEvent.press(screen.getByTestId('profile-add'));
  await fireEvent.changeText(await screen.findByTestId('profile-nickname'), 'Bitu');
  await fireEvent.press(screen.getByTestId('avatar-dolphin'));
  await fireEvent.press(screen.getByTestId('profile-save'));
  expect(await screen.findByText('Bitu')).toBeTruthy();
  expect(useProfiles.getState().profiles[1]).toMatchObject({ nickname: 'Bitu', avatar: 'dolphin' });
});

it('shows a friendly message at the 40-profile limit', async () => {
  useProfiles.setState({ profiles: make(MAX_PROFILES), currentId: 'p0' });
  await renderStack('ProfileEdit', {});
  expect(screen.getByTestId('profile-limit')).toHaveTextContent(/already 40 child profiles/);
  expect(screen.queryByTestId('profile-save')).toBeNull();
});

it('limits nicknames to 20 characters', async () => {
  useProfiles.setState({ profiles: [], currentId: null });
  await renderStack('ProfileEdit', {});
  expect(screen.getByTestId('profile-nickname').props.maxLength).toBe(20);
});

it('edits a profile', async () => {
  useProfiles.setState({ profiles: make(2), currentId: 'p0' });
  await renderStack('ProfileEdit', { profileId: 'p1' });
  expect(screen.getByTestId('profile-nickname').props.value).toBe('Kid 1');
  await fireEvent.changeText(screen.getByTestId('profile-nickname'), 'Moni');
  await fireEvent.press(screen.getByTestId('profile-save'));
  expect(useProfiles.getState().profiles[1]?.nickname).toBe('Moni');
});

it('deletes a profile and its progress only after confirming', async () => {
  useProfiles.setState({ profiles: make(2), currentId: 'p0' });
  useProgress.getState().record('p1', 'asm-beng', 'letter:a', 1, 3);
  await renderStack('ProfileEdit', { profileId: 'p1' });
  await fireEvent.press(screen.getByTestId('profile-delete'));
  await fireEvent.press(screen.getByTestId('profile-delete-cancel'));
  expect(useProfiles.getState().profiles).toHaveLength(2);
  await fireEvent.press(screen.getByTestId('profile-delete'));
  await fireEvent.press(screen.getByTestId('profile-delete-confirm'));
  expect(useProfiles.getState().profiles.map(p => p.id)).toEqual(['p0']);
  expect(useProgress.getState().progress.p1).toBeUndefined();
});

it('returns to onboarding when the last profile is deleted', async () => {
  useProfiles.setState({ profiles: make(1), currentId: 'p0' });
  await renderStack('ProfileEdit', { profileId: 'p0' });
  await fireEvent.press(screen.getByTestId('profile-delete'));
  await fireEvent.press(screen.getByTestId('profile-delete-confirm'));
  expect(await screen.findByTestId('screen-Onboarding')).toBeTruthy();
});
