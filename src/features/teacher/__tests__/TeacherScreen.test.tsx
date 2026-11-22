import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';

import type { RootStackParamList } from '@/navigation';
import { useProfiles, useProgress, type Profile } from '@/progress';
import { DEFAULT_SETTINGS, useSettings } from '@/storage';

import { TeacherChildScreen } from '../screens/TeacherChildScreen';
import { TeacherScreen } from '../screens/TeacherScreen';

// A pack with 55 letters, 2 signs and 3 numbers (the shipped packs are still empty drafts).
jest.mock('@/content/packs', () => {
  const letters = Array.from({ length: 55 }, (_, i) => ({
    id: `l${i}`,
    key: `letter:l${i}`,
    glyph: `L${i}`,
    group: 'consonant',
    order: i,
    audio: `audio/l${i}.m4a`,
  }));
  const pack = {
    id: 'asm-beng',
    language: { iso639_3: 'asm', nameNative: 'অসমীয়া', nameEn: 'Assamese', nameAs: 'অসমীয়া' },
    script: 'Beng',
    letters,
    signs: [
      { id: 's0', key: 'sign:s0', result: 'S0' },
      { id: 's1', key: 'sign:s1', result: 'S1' },
    ],
    numbers: [1, 2, 3].map(v => ({ value: v, key: `number:${v}`, numeral: `N${v}` })),
    words: [],
  };
  return {
    PACKS: [pack],
    DEFAULT_PACK_ID: 'asm-beng',
    getPack: () => pack,
    packAsset: () => undefined,
  };
});

const Stack = createNativeStackNavigator<RootStackParamList>();

function Home() {
  return <Text testID="screen-Home">home</Text>;
}

async function renderTeacher() {
  await render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Teacher" component={TeacherScreen} />
        <Stack.Screen name="TeacherChild" component={TeacherChildScreen} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await screen.findByTestId('screen-Teacher');
}

const profiles: Profile[] = Array.from({ length: 40 }, (_, i) => ({
  id: `p${i}`,
  nickname: `Child ${i}`,
  avatar: 'rhino',
  createdAt: i,
}));

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ ...DEFAULT_SETTINGS, uiLanguage: 'en', onboarded: true });
  useProfiles.setState({ profiles, currentId: 'p0' });
  useProgress.setState({ progress: {} });
  useProgress.getState().record('p1', 'asm-beng', 'letter:l0', 1, 2);
  useProgress.getState().record('p1', 'asm-beng', 'letter:l0', 2, 3);
  useProgress.getState().record('p1', 'asm-beng', 'number:2', 1, 1);
});

it('renders a virtualised grid for 40 children × 55 letters', async () => {
  await renderTeacher();
  expect(screen.getByTestId('teacher-grid')).toBeTruthy();
  expect(screen.getByText('L54')).toBeTruthy();
  expect(screen.getByTestId('teacher-row-p0')).toBeTruthy();
  // Not every row is mounted at once.
  expect(screen.queryByTestId('teacher-row-p39')).toBeNull();
});

it('switches tabs between letters, signs and numbers', async () => {
  await renderTeacher();
  await fireEvent.press(screen.getByTestId('teacher-tab-numbers'));
  expect(screen.getByText('N3')).toBeTruthy();
  expect(screen.queryByText('L0')).toBeNull();
  await fireEvent.press(screen.getByTestId('teacher-tab-signs'));
  expect(screen.getByText('S1')).toBeTruthy();
});

it('opens a child, shows their stars and switches to them', async () => {
  await renderTeacher();
  await fireEvent.press(screen.getByTestId('teacher-row-p1'));
  expect(await screen.findByTestId('screen-TeacherChild')).toBeTruthy();
  expect(screen.getByTestId('teacher-child-summary').props.children).toBe('3 stars · 1/55 tried');
  await fireEvent.press(screen.getByTestId('teacher-switch'));
  expect(await screen.findByTestId('screen-Home')).toBeTruthy();
  expect(useProfiles.getState().currentId).toBe('p1');
});

it('shares the CSV as a UTF-8 data URL', async () => {
  await renderTeacher();
  await fireEvent.press(screen.getByTestId('teacher-share-csv'));
  await waitFor(() => expect(Share.open).toHaveBeenCalledTimes(1));
  const opts = (Share.open as jest.Mock).mock.calls[0][0];
  expect(opts.type).toBe('text/csv');
  const csv = Buffer.from(opts.url.replace('data:text/csv;base64,', ''), 'base64').toString('utf8');
  expect(csv.startsWith('﻿Nickname,L0,')).toBe(true);
  expect(csv).toContain('\r\nChild 1,3,0,');
  expect(csv.split('\r\n')).toHaveLength(42);
});

it('renders the PDF from HTML and shares the file', async () => {
  await renderTeacher();
  await fireEvent.press(screen.getByTestId('teacher-share-pdf'));
  await waitFor(() => expect(Share.open).toHaveBeenCalledTimes(1));
  const html = (generatePDF as jest.Mock).mock.calls[0][0].html as string;
  expect(html.match(/<table>/g)).toHaveLength(3);
  expect((Share.open as jest.Mock).mock.calls[0][0]).toMatchObject({
    url: 'file:///tmp/report.pdf',
    type: 'application/pdf',
  });
});
