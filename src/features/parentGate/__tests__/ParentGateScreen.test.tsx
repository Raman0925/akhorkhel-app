import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import type { RootStackParamList } from '@/navigation';
import { DEFAULT_SETTINGS, useSettings } from '@/storage';

import { resetGateMemory } from '../gateMemory';
import { ParentGateScreen } from '../screens/ParentGateScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Teacher() {
  return <Text testID="screen-Teacher">teacher</Text>;
}

async function renderGate() {
  await render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="ParentGate"
          component={ParentGateScreen}
          initialParams={{ next: 'Teacher' }}
        />
        <Stack.Screen name="Teacher" component={Teacher} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await screen.findByTestId('screen-ParentGate');
}

function answer(): number {
  const text = String(screen.getByTestId('parent-gate-question').props.children);
  const [, a, b] = /(\d+) × (\d+)/.exec(text)!;
  return Number(a) * Number(b);
}

async function type(value: number) {
  for (const d of String(value)) {
    await fireEvent.press(screen.getByTestId(`parent-gate-key-${d}`));
  }
  await fireEvent.press(screen.getByTestId('parent-gate-submit'));
}

beforeEach(() => {
  resetGateMemory();
  useSettings.setState({ ...DEFAULT_SETTINGS, uiLanguage: 'en' });
});

it('shows a multiplication and a numeric keypad', async () => {
  await renderGate();
  expect(screen.getByTestId('parent-gate-question').props.children).toMatch(/^1\d × [3-9] = \?$/);
  for (let d = 0; d <= 9; d++) {
    expect(screen.getByTestId(`parent-gate-key-${d}`)).toBeTruthy();
  }
});

it('opens the next screen after the right answer', async () => {
  await renderGate();
  await type(answer());
  expect(await screen.findByTestId('screen-Teacher')).toBeTruthy();
});

it('gives a new question after a wrong answer', async () => {
  await renderGate();
  const first = screen.getByTestId('parent-gate-question').props.children;
  await type(answer() + 1);
  expect(screen.getByText('That is not right. Here is a new question.')).toBeTruthy();
  expect(screen.getByTestId('parent-gate-question').props.children).not.toBe(first);
  await type(answer());
  expect(await screen.findByTestId('screen-Teacher')).toBeTruthy();
});

it('locks for 30 seconds after 3 wrong answers, even when reopened', async () => {
  await renderGate();
  await type(answer() + 1);
  await type(answer() + 1);
  await type(answer() + 1);
  expect(screen.getByTestId('parent-gate-feedback')).toHaveTextContent(
    'Too many wrong answers. Please wait 30 seconds and try again.',
  );
  await fireEvent.press(screen.getByTestId('parent-gate-key-1'));
  expect(screen.getByTestId('parent-gate-answer')).toHaveTextContent('');
  screen.unmount();

  await renderGate();
  expect(screen.getByTestId('parent-gate-feedback')).toHaveTextContent(/Please wait \d+ seconds/);
});
