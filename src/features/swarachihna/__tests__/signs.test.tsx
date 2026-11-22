import { act, fireEvent, screen } from '@testing-library/react-native';

import { audio } from '@/audio';
import { mockAudio } from '@/audio/testing';
import { useProgress } from '@/progress';

import { fixturePack } from '../__fixtures__/pack';
import { PROFILE_ID, renderScreen, resetStores } from '../__fixtures__/render';
import { signAlone } from '../logic/signAlone';
import { SignListScreen } from '../screens/SignListScreen';
import { SignScreen } from '../screens/SignScreen';

const mockPack = fixturePack();
jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));

const playPack = jest.spyOn(audio, 'playPack');

beforeEach(() => {
  resetStores();
  playPack.mockClear();
});

it('puts a lone sign on a dotted circle once', () => {
  expect(signAlone('a')).toBe('◌a');
  expect(signAlone('◌a')).toBe('◌a');
});

it('SignList shows results with stars and no banner, and opens a sign', async () => {
  useProgress.getState().record(PROFILE_ID, mockPack.id, 'sign:ki', 1, 3);
  await renderScreen('SignList', SignListScreen, undefined, ['Sign']);
  expect(screen.queryByTestId('banner-slot')).toBeNull();
  expect(screen.getByText('Ka')).toBeTruthy();
  expect(screen.getByTestId('sign-tile-ki')).toHaveTextContent(/Ki/);
  expect(screen.getAllByLabelText('3 / 3')).toHaveLength(1);
  await fireEvent.press(screen.getByTestId('sign-tile-ki'));
  expect(await screen.findByTestId('screen-Sign')).toHaveTextContent('{"signId":"ki"}');
});

it('Sign shows base + sign = result, speaks it after the animation and opens Trace', async () => {
  jest.useFakeTimers();
  try {
    await renderScreen('Sign', SignScreen, { signId: 'ka' }, ['Trace']);
    expect(screen.queryByTestId('banner-slot')).toBeNull();
    expect(screen.getByTestId('sign-base')).toHaveTextContent('K');
    expect(screen.getByTestId('sign-sign')).toHaveTextContent('◌a');
    expect(screen.getByTestId('sign-result')).toHaveTextContent('Ka');
    expect(playPack).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });
    expect(playPack).toHaveBeenCalledWith('tst-latn', 'audio/signs/ka.m4a');

    await fireEvent.press(screen.getByTestId('sign-trace'));
    expect(await screen.findByTestId('screen-Trace')).toHaveTextContent('{"itemKey":"sign:ka"}');
  } finally {
    jest.useRealTimers();
  }
});

it('Sign shows the listen button when the syllable is recorded', async () => {
  await renderScreen('Sign', SignScreen, { signId: 'ka' });
  expect(screen.getByTestId('sign-listen')).toBeTruthy();
});

it('Sign hides the listen button when the syllable is not recorded', async () => {
  mockAudio('none');
  await renderScreen('Sign', SignScreen, { signId: 'ka' });
  expect(screen.queryByTestId('sign-listen')).toBeNull();
  expect(screen.getByTestId('sign-result')).toHaveTextContent('Ka');
});
