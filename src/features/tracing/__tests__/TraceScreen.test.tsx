import { jest } from '@jest/globals';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { audio } from '@/audio';
import type { RootStackParamList, ScreenProps } from '@/navigation';
import { useProfiles, useProgress } from '@/progress';
import { useSettings } from '@/storage/settings';

import { TraceScreen } from '../screens/TraceScreen';
import { startLevel } from '../traceables';
import { FIXTURE_PACK, PLUS_STROKES } from '../testing/fixturePack';

jest.mock('@/ui/usePack', () => ({
  usePack: () => require('../testing/fixturePack').FIXTURE_PACK,
}));

const Stack = createNativeStackNavigator<RootStackParamList>();
const goBack = jest.fn();

function Wrapper(props: ScreenProps<'Trace'>) {
  return <TraceScreen {...props} navigation={{ ...props.navigation, goBack }} />;
}

async function renderTrace(params: RootStackParamList['Trace']) {
  await render(
    <GestureHandlerRootView>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Trace" component={Wrapper} initialParams={params} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>,
  );
  await screen.findByTestId('screen-Trace');
}

/** Draw a unit-box stroke on the canvas through the pan gesture. */
async function draw(points: [number, number][], size: number) {
  const [first, ...rest] = points;
  if (!first) {
    return;
  }
  const px = (p: [number, number]) => ({ x: p[0] * size, y: p[1] * size });
  fireGestureHandler(getByGestureTestId('trace-pan'), [
    { state: State.BEGAN, ...px(first) },
    { state: State.ACTIVE, ...px(first) },
    ...rest.map(p => ({ state: State.ACTIVE, ...px(p) })),
    { state: State.END, ...px(rest[rest.length - 1] ?? first) },
  ]);
  // Stroke end is scheduled to the JS thread (a microtask in Jest).
  await act(async () => {
    await Promise.resolve();
  });
}

function canvasSize(): number {
  const style = screen.getByTestId('trace-canvas').props.style as { width: number }[];
  return style.flat().reduce((w, s) => (s && 'width' in s ? s.width : w), 0);
}

beforeEach(() => {
  goBack.mockClear();
  useProgress.setState({ progress: {} });
  useProfiles.setState({ profiles: [], currentId: null });
  useSettings.setState({ leftHanded: false });
});

it('renders the tracing canvas for an item with geometry', async () => {
  await renderTrace({ itemKey: 'letter:plus' });
  expect(screen.getByTestId('trace-canvas')).toBeTruthy();
  expect(screen.getByTestId('trace-watch')).toBeTruthy();
  expect(screen.getByTestId('trace-clear')).toBeTruthy();
  expect(screen.queryByTestId('banner-slot')).toBeNull();
  expect(screen.getByTestId('trace-level')).toHaveTextContent(/1/);
});

it('plays the demo, then the "start at the green dot" prompt', async () => {
  const spy = jest.spyOn(audio, 'playPrompt');
  await renderTrace({ itemKey: 'letter:plus' });
  expect(spy).toHaveBeenCalledWith('traceWatch');
  await waitFor(() => expect(spy).toHaveBeenCalledWith('traceStart'));
  spy.mockRestore();
});

it('renders in left-hand mode', async () => {
  useSettings.setState({ leftHanded: true });
  await renderTrace({ itemKey: 'letter:plus' });
  expect(screen.getByTestId('trace-canvas')).toBeTruthy();
});

it('shows a friendly message for an item without geometry', async () => {
  await renderTrace({ itemKey: 'letter:empty' });
  expect(screen.getByTestId('trace-not-ready')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('trace-done'));
  expect(goBack).toHaveBeenCalled();
});

it('shows a friendly message for an unknown item', async () => {
  await renderTrace({ itemKey: 'letter:nope' });
  expect(screen.getByTestId('trace-not-ready')).toBeTruthy();
});

it('starts at the level given in the params', async () => {
  await renderTrace({ itemKey: 'number:1', level: 3 });
  expect(screen.getByTestId('trace-level')).toHaveTextContent(/3/);
  expect(screen.queryByTestId('trace-next-level')).toBeNull();
});

it('records three traces, shows stars and offers the next level', async () => {
  const profile = useProfiles.getState().addProfile('Moni', 'rhino');
  expect(profile).not.toBeNull();
  await renderTrace({ itemKey: 'letter:plus' });
  const size = canvasSize();
  expect(size).toBeGreaterThan(0);

  for (let round = 0; round < 3; round++) {
    for (const stroke of PLUS_STROKES) {
      await draw(stroke, size);
    }
    expect(await screen.findByTestId('trace-result')).toBeTruthy();
    if (round < 2) {
      await fireEvent.press(screen.getByTestId('trace-again'));
    }
  }

  const item = useProgress.getState().progress[profile!.id]?.[FIXTURE_PACK.id]?.['letter:plus'];
  expect(item?.attempts).toBe(3);
  expect(item?.best[0]).toBe(3);
  expect(startLevel(item)).toBe(2);

  await fireEvent.press(screen.getByTestId('trace-next-level'));
  expect(screen.getByTestId('trace-level')).toHaveTextContent(/2/);
  expect(screen.queryByTestId('trace-result')).toBeNull();
});

it('does not record without a profile, and Done goes back', async () => {
  await renderTrace({ itemKey: 'number:1', level: 1 });
  const size = canvasSize();
  for (let round = 0; round < 3; round++) {
    await draw(PLUS_STROKES[1] as [number, number][], size);
    if (round < 2) {
      await fireEvent.press(await screen.findByTestId('trace-again'));
    }
  }
  expect(await screen.findByTestId('trace-result')).toBeTruthy();
  expect(useProgress.getState().progress).toEqual({});
  await fireEvent.press(screen.getByTestId('trace-done'));
  expect(goBack).toHaveBeenCalled();
});

it('a weak stroke does not advance or show a result', async () => {
  await renderTrace({ itemKey: 'letter:plus', level: 2 });
  const size = canvasSize();
  await draw([...(PLUS_STROKES[0] as [number, number][])].reverse(), size);
  expect(screen.queryByTestId('trace-result')).toBeNull();
  await fireEvent.press(screen.getByTestId('trace-watch'));
  await fireEvent.press(screen.getByTestId('trace-clear'));
  expect(screen.queryByTestId('trace-result')).toBeNull();
});
