import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { GameHearScreen, GamePictureScreen, GamesHubScreen } from '@/features/games';
import { HomeScreen } from '@/features/home';
import { LetterGridScreen, LetterScreen } from '@/features/letters';
import { CountScreen, NumberListScreen, NumberScreen } from '@/features/numbers';
import { AdsNoticeScreen, ParentAreaScreen, PrivacyPolicyScreen } from '@/features/parentArea';
import { ParentGateScreen } from '@/features/parentGate';
import { OnboardingScreen, ProfileEditScreen, ProfilePickerScreen } from '@/features/profiles';
import { SignListScreen, SignScreen } from '@/features/swarachihna';
import { TeacherChildScreen, TeacherScreen } from '@/features/teacher';
import { StrokeRecorderScreen, TraceScreen } from '@/features/tracing';
import { WordListScreen, WordScreen } from '@/features/words';
import type { RootStackParamList } from '@/navigation';
import { useProfiles } from '@/progress';
import { useSettings } from '@/storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const onboarded = useSettings(s => s.onboarded);
  const profileCount = useProfiles(s => s.profiles.length);
  const initial: keyof RootStackParamList =
    !onboarded || profileCount === 0 ? 'Onboarding' : 'Home';

  return (
    <Stack.Navigator
      initialRouteName={initial}
      screenOptions={{ headerShown: false, animation: 'slide_from_right', orientation: 'portrait' }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="ProfilePicker" component={ProfilePickerScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />

      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="LetterGrid" component={LetterGridScreen} />
      <Stack.Screen name="Letter" component={LetterScreen} />
      <Stack.Screen name="SignList" component={SignListScreen} />
      <Stack.Screen name="Sign" component={SignScreen} />
      <Stack.Screen name="GamesHub" component={GamesHubScreen} />
      <Stack.Screen name="GameHear" component={GameHearScreen} />
      <Stack.Screen name="GamePicture" component={GamePictureScreen} />
      <Stack.Screen name="WordList" component={WordListScreen} />
      <Stack.Screen name="Word" component={WordScreen} />
      <Stack.Screen name="NumberList" component={NumberListScreen} />
      <Stack.Screen name="Number" component={NumberScreen} />
      <Stack.Screen name="Count" component={CountScreen} />

      {/* Tracing: no swipe-back gesture so drawing near the edge never leaves the screen. */}
      <Stack.Screen name="Trace" component={TraceScreen} options={{ gestureEnabled: false }} />
      {__DEV__ ? <Stack.Screen name="StrokeRecorder" component={StrokeRecorderScreen} /> : null}

      <Stack.Screen
        name="ParentGate"
        component={ParentGateScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="ParentArea" component={ParentAreaScreen} />
      <Stack.Screen name="AdsNotice" component={AdsNoticeScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Teacher" component={TeacherScreen} />
      <Stack.Screen name="TeacherChild" component={TeacherChildScreen} />
    </Stack.Navigator>
  );
}
