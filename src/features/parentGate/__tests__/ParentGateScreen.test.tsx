import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import type { RootStackParamList } from '@/navigation';
import { DEFAULT_SETTINGS, useSettings } from '@/storage';

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

/** Any keypad key that is not part of the answer. */
function wrongKey() {
  return screen.getAllByTestId(/^parent-gate-key-/)[0]!;
}

beforeEach(() => useSettings.setState({ ...DEFAULT_SETTINGS, uiLanguage: 'en' }));

it('shows the numbers as words and a 9-key keypad', async () => {
  await renderGate();
  expect(screen.getByText('Tap the numbers in this order:')).toBeTruthy();
  expect(screen.getByTestId('parent-gate-words').props.children).toMatch(
    /^(one|two|three|four|five|six|seven|eight|nine)(, (one|two|three|four|five|six|seven|eight|nine)){2}$/,
  );
  expect(screen.getAllByRole('button', { name: /^[1-9]$/ })).toHaveLength(9);
});

it('opens the next screen after the right sequence', async () => {
  await renderGate();
  await fireEvent.press(screen.getByTestId('parent-gate-step-1'));
  await fireEvent.press(screen.getByTestId('parent-gate-step-2'));
  await fireEvent.press(screen.getByTestId('parent-gate-step-3'));
  expect(await screen.findByTestId('screen-Teacher')).toBeTruthy();
});

it('lets the grown-up retry after a wrong tap, then gives a new challenge', async () => {
  await renderGate();
  await fireEvent.press(screen.getByTestId('parent-gate-step-1'));
  await fireEvent.press(wrongKey());
  expect(screen.getByText('Not quite. Start again from the first number.')).toBeTruthy();
  await fireEvent.press(wrongKey());
  await fireEvent.press(wrongKey());
  expect(screen.getByText('Here is a new one. Take your time.')).toBeTruthy();
  // The new challenge still works.
  await fireEvent.press(screen.getByTestId('parent-gate-step-1'));
  await fireEvent.press(screen.getByTestId('parent-gate-step-2'));
  await fireEvent.press(screen.getByTestId('parent-gate-step-3'));
  expect(await screen.findByTestId('screen-Teacher')).toBeTruthy();
});
