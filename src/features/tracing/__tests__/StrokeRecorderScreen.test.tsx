import { jest } from '@jest/globals';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import Share from 'react-native-share';

import type { RootStackParamList } from '@/navigation';

import { StrokeRecorderScreen } from '../screens/StrokeRecorderScreen';

jest.mock('@/ui/usePack', () => ({
  usePack: () => require('../testing/fixturePack').FIXTURE_PACK,
}));

const Stack = createNativeStackNavigator<RootStackParamList>();

async function renderRecorder(params: RootStackParamList['StrokeRecorder']) {
  await render(
    <GestureHandlerRootView>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="StrokeRecorder"
            component={StrokeRecorderScreen}
            initialParams={params}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>,
  );
  await screen.findByTestId('screen-StrokeRecorder');
}

async function drawLine(x0: number, y0: number, x1: number, y1: number) {
  const steps = 10;
  fireGestureHandler(getByGestureTestId('recorder-pan'), [
    { state: State.BEGAN, x: x0, y: y0 },
    ...Array.from({ length: steps }, (_, i) => ({
      state: State.ACTIVE,
      x: x0 + ((x1 - x0) * (i + 1)) / steps,
      y: y0 + ((y1 - y0) * (i + 1)) / steps,
    })),
    { state: State.END, x: x1, y: y1 },
  ]);
  await act(async () => {
    await Promise.resolve();
  });
}

it('lists the pack traceables and opens one', async () => {
  await renderRecorder({});
  expect(screen.getByTestId('recorder-item-letter:plus')).toBeTruthy();
  expect(screen.getByTestId('recorder-item-number:1')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('recorder-item-letter:plus'));
  expect(screen.getByTestId('recorder-count')).toHaveTextContent('0 strokes');
  await fireEvent.press(screen.getByTestId('recorder-back'));
  expect(screen.getByTestId('recorder-item-letter:plus')).toBeTruthy();
});

it('records, undoes, previews and exports strokes as geometry JSON', async () => {
  await renderRecorder({ itemKey: 'letter:plus' });
  await drawLine(40, 150, 260, 150);
  expect(screen.getByTestId('recorder-count')).toHaveTextContent('1 strokes');
  await fireEvent.press(screen.getByTestId('recorder-undo'));
  expect(screen.getByTestId('recorder-count')).toHaveTextContent('0 strokes');

  await drawLine(40, 150, 260, 150);
  await drawLine(150, 40, 150, 260);
  await drawLine(10, 10, 10.2, 10); // a tap is dropped
  expect(screen.getByTestId('recorder-count')).toHaveTextContent('2 strokes');
  await fireEvent.press(screen.getByTestId('recorder-preview'));

  await fireEvent.press(screen.getByTestId('recorder-export'));
  const open = Share.open as unknown as jest.Mock;
  expect(open).toHaveBeenCalledTimes(1);
  const { message } = open.mock.calls[0]?.[0] as { message: string };
  const parsed = JSON.parse(message) as Record<
    string,
    { strokeSource: string; strokes: { points: number[][] }[] }
  >;
  const entry = parsed['letter:plus'];
  expect(entry?.strokeSource).toBe('recorded');
  expect(entry?.strokes).toHaveLength(2);
  entry?.strokes
    .flatMap(s => s.points.flat())
    .forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });

  await fireEvent.press(screen.getByTestId('recorder-clear'));
  expect(screen.getByTestId('recorder-count')).toHaveTextContent('0 strokes');
});
