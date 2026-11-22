/**
 * Route contract (frozen, owner A0). Every screen in the app is listed here with its params.
 * Owners: A2 tracing, A4 learning UI, A5 profiles/teacher/parent.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TraceLevelParam = 1 | 2 | 3;

/** Screens a parent-gate success can lead to. */
export type GatedRoute = 'ParentArea' | 'Teacher';

export type RootStackParamList = {
  // A5: first launch (pick language, create first child) and profiles
  Onboarding: undefined;
  ProfilePicker: undefined;
  ProfileEdit: { profileId?: string };

  // A4: child home and learning modules
  Home: undefined;
  LetterGrid: undefined;
  Letter: { letterId: string };
  SignList: undefined;
  Sign: { signId: string };
  GamesHub: undefined;
  GameHear: undefined;
  GamePicture: undefined;
  WordList: undefined;
  Word: { wordId: string };
  NumberList: undefined;
  Number: { value: number };
  Count: { value: number };

  // A2: tracing (letters, signs and numbers all trace here)
  Trace: { itemKey: string; level?: TraceLevelParam };
  StrokeRecorder: { itemKey?: string }; // __DEV__ only

  // A5: grown-up areas (always reached through ParentGate)
  ParentGate: { next: GatedRoute };
  ParentArea: undefined;
  AdsNotice: undefined;
  PrivacyPolicy: undefined;
  Teacher: undefined;
  TeacherChild: { profileId: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
