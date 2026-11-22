import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import InAppReview from 'react-native-in-app-review';

import * as monetization from '@/monetization';
import type { RootStackParamList } from '@/navigation';
import { useProfiles, useProgress } from '@/progress';
import { DEFAULT_SETTINGS, mmkv, useSettings } from '@/storage';

import { AdsNoticeScreen } from '../screens/AdsNoticeScreen';
import { ParentAreaScreen } from '../screens/ParentAreaScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';

jest.mock('@/monetization', () => {
  const actual = jest.requireActual('@/monetization');
  return {
    ...actual,
    resetAdsState: jest.fn(),
  };
});

const Stack = createNativeStackNavigator<RootStackParamList>();
const Stub = (id: string) =>
  function StubScreen() {
    return <Text testID={id}>{id}</Text>;
  };
const Onboarding = Stub('screen-Onboarding');
const Teacher = Stub('screen-Teacher');
const ProfileEdit = Stub('screen-ProfileEdit');

async function renderStack(initial: keyof RootStackParamList = 'ParentArea') {
  await render(
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initial}>
        <Stack.Screen name="ParentArea" component={ParentAreaScreen} />
        <Stack.Screen name="AdsNotice" component={AdsNoticeScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Onboarding" component={Onboarding} />
        <Stack.Screen name="Teacher" component={Teacher} />
        <Stack.Screen name="ProfileEdit" component={ProfileEdit} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({
    ...DEFAULT_SETTINGS,
    uiLanguage: 'en',
    onboarded: true,
    adsNoticeSeen: true,
  });
  useProfiles.setState({
    profiles: [{ id: 'p1', nickname: 'Minu', avatar: 'rhino', createdAt: 1 }],
    currentId: 'p1',
  });
  useProgress.setState({ progress: {} });
});

describe('ParentArea', () => {
  it('shows the notice first while it is unseen, then the settings', async () => {
    useSettings.setState({ adsNoticeSeen: false });
    await renderStack();
    expect(screen.getByTestId('ads-notice-content')).toBeTruthy();
    expect(screen.queryByTestId('banner-slot')).toBeNull();
    await fireEvent.press(screen.getByTestId('ads-notice-accept'));
    expect(await screen.findByText('Settings')).toBeTruthy();
    expect(screen.getByTestId('banner-slot')).toBeTruthy();
  });

  it('changes settings', async () => {
    await renderStack();
    await fireEvent.press(screen.getByTestId('parent-ui-as'));
    expect(useSettings.getState().uiLanguage).toBe('as');
    expect(screen.getByText('অভিভাৱকৰ অংশ')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('parent-pack-brx-deva'));
    expect(useSettings.getState().packId).toBe('brx-deva');
    await fireEvent.press(screen.getByTestId('parent-left-handed'));
    expect(useSettings.getState().leftHanded).toBe(true);
    await fireEvent.press(screen.getByTestId('parent-sound'));
    expect(useSettings.getState().soundOn).toBe(false);
  });

  it('links to teacher mode and child editing', async () => {
    await renderStack();
    await fireEvent.press(screen.getByTestId('parent-child-p1'));
    expect(await screen.findByTestId('screen-ProfileEdit')).toBeTruthy();
  });

  it('lets the parent pick any sticker theme (all free)', async () => {
    await renderStack();
    expect(screen.getByTestId('parent-sticker-stars')).toBeSelected();
    await fireEvent.press(screen.getByTestId('parent-sticker-festival'));
    expect(useSettings.getState().stickerTheme).toBe('festival');
    expect(screen.getByTestId('parent-sticker-festival')).toBeSelected();
    expect(screen.getByTestId('parent-sticker-stars')).not.toBeSelected();
  });

  it('opens teacher mode', async () => {
    await renderStack();
    await fireEvent.press(screen.getByTestId('parent-teacher'));
    expect(await screen.findByTestId('screen-Teacher')).toBeTruthy();
  });

  it('offers a rating only after 3 sessions, once', async () => {
    useSettings.setState({ completedSessions: 2 });
    await renderStack();
    expect(screen.queryByTestId('parent-rate-card')).toBeNull();
    await act(() => useSettings.setState({ completedSessions: 3 }));
    expect(await screen.findByTestId('parent-rate-card')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('parent-rate'));
    await waitFor(() => expect(useSettings.getState().reviewRequested).toBe(true));
    expect(InAppReview.RequestInAppReview).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('parent-rate-card')).toBeNull();
  });

  it('deletes all data only after two confirmations', async () => {
    useProgress.getState().record('p1', 'asm-beng', 'letter:a', 1, 3);
    mmkv.set('other', 'x');
    await renderStack();
    await fireEvent.press(screen.getByTestId('parent-delete-all'));
    expect(screen.getByTestId('parent-delete-all-stage-1')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('parent-delete-all-cancel'));
    expect(useProfiles.getState().profiles).toHaveLength(1);

    await fireEvent.press(screen.getByTestId('parent-delete-all'));
    await fireEvent.press(screen.getByTestId('parent-delete-all-confirm'));
    expect(screen.getByTestId('parent-delete-all-stage-2')).toBeTruthy();
    expect(useProfiles.getState().profiles).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('parent-delete-all-confirm'));

    expect(await screen.findByTestId('screen-Onboarding')).toBeTruthy();
    expect(useProfiles.getState().profiles).toHaveLength(0);
    expect(useProgress.getState().progress).toEqual({});
    expect(useSettings.getState()).toMatchObject({ onboarded: false, adsNoticeSeen: false });
    expect(mmkv.getString('other')).toBeUndefined();
    expect(
      (monetization as unknown as { resetAdsState: jest.Mock }).resetAdsState,
    ).toHaveBeenCalled();
  });
});

describe('static screens', () => {
  it('privacy policy matches the data-safety summary', async () => {
    await renderStack('PrivacyPolicy');
    expect(screen.getByText(/IP address, app interactions/)).toBeTruthy();
    expect(screen.getByText(/device identifiers such as the app set ID/)).toBeTruthy();
    expect(screen.getByText(/does not use or send the Android Advertising ID/)).toBeTruthy();
    expect(screen.getByTestId('privacy-url')).toHaveTextContent(
      'https://raman0925.github.io/akhorkhel/privacy.html',
    );
  });

  it('ads notice marks itself seen', async () => {
    useSettings.setState({ adsNoticeSeen: false });
    await renderStack('AdsNotice');
    await fireEvent.press(screen.getByTestId('ads-notice-accept'));
    expect(useSettings.getState().adsNoticeSeen).toBe(true);
  });
});
