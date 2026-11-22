import { fireEvent, screen } from '@testing-library/react-native';

import { audio } from '@/audio';
import { mockAudio } from '@/audio/testing';
import { useProgress } from '@/progress';

import { fixturePack } from '../__fixtures__/pack';
import { PROFILE_ID, renderScreen, resetStores } from '../__fixtures__/render';
import { countObjects, MAX_COUNT } from '../logic/count';
import { CountScreen } from '../screens/CountScreen';
import { NumberListScreen } from '../screens/NumberListScreen';
import { NumberScreen } from '../screens/NumberScreen';

const mockPack = fixturePack();
jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));

const playPack = jest.spyOn(audio, 'playPack');

beforeEach(() => {
  resetStores();
  playPack.mockClear();
});

it('countObjects makes one object per number, capped', () => {
  expect(countObjects(3, ['x', 'y'], 1)).toEqual(['y', 'y', 'y']);
  expect(countObjects(2, [], 0)).toHaveLength(2);
  expect(countObjects(99, ['x'], 0)).toHaveLength(MAX_COUNT);
});

it('NumberList shows numerals with stars and no banner', async () => {
  useProgress.getState().record(PROFILE_ID, mockPack.id, 'number:2', 1, 2);
  await renderScreen('NumberList', NumberListScreen, undefined, ['Number']);
  expect(screen.queryByTestId('banner-slot')).toBeNull();
  expect(screen.getByText('n3')).toBeTruthy();
  expect(screen.getByTestId('number-tile-2')).toHaveTextContent(/n2/);
  expect(screen.getAllByLabelText('2 / 3')).toHaveLength(1);
  await fireEvent.press(screen.getByTestId('number-tile-3'));
  expect(await screen.findByTestId('screen-Number')).toHaveTextContent('{"value":3}');
});

it('Number plays its audio, shows the word and opens Trace', async () => {
  await renderScreen('Number', NumberScreen, { value: 3 }, ['Trace', 'Count']);
  expect(playPack).toHaveBeenCalledWith('tst-latn', 'audio/numbers/3.m4a');
  expect(screen.getByText('three-word')).toBeTruthy();
  expect(screen.queryByTestId('banner-slot')).toBeNull();
  await fireEvent.press(screen.getByTestId('number-trace'));
  expect(await screen.findByTestId('screen-Trace')).toHaveTextContent('{"itemKey":"number:3"}');
});

it('Number shows the listen button when the number is recorded', async () => {
  await renderScreen('Number', NumberScreen, { value: 3 });
  expect(screen.getByTestId('number-listen')).toBeTruthy();
});

it('Number hides the listen button when the number is not recorded', async () => {
  mockAudio('none');
  await renderScreen('Number', NumberScreen, { value: 3 });
  expect(screen.queryByTestId('number-listen')).toBeNull();
  expect(screen.getByTestId('number-trace')).toBeTruthy();
});

it('Count shows the header speaker when its prompt is recorded', async () => {
  await renderScreen('Count', CountScreen, { value: 1 });
  expect(screen.getByTestId('header-speaker')).toBeTruthy();
});

it('Count hides the header speaker without a recorded prompt', async () => {
  mockAudio('none');
  await renderScreen('Count', CountScreen, { value: 1 });
  expect(screen.queryByTestId('header-speaker')).toBeNull();
});

it('Number opens Count', async () => {
  await renderScreen('Number', NumberScreen, { value: 2 }, ['Count']);
  await fireEvent.press(screen.getByTestId('number-count'));
  expect(await screen.findByTestId('screen-Count')).toHaveTextContent('{"value":2}');
});

it('Number hides Count above the counting limit', async () => {
  await renderScreen('Number', NumberScreen, { value: 30 });
  expect(screen.getByTestId('number-trace')).toBeTruthy();
  expect(screen.queryByTestId('number-count')).toBeNull();
});

it('Count counts each object once, then plays the number and celebrates', async () => {
  const sfx = jest.spyOn(audio, 'sfx');
  await renderScreen('Count', CountScreen, { value: 3 });
  expect(screen.queryByTestId('banner-slot')).toBeNull();

  await fireEvent.press(screen.getByTestId('count-object-1'));
  expect(sfx).toHaveBeenCalledWith('pop');
  expect(screen.getByTestId('count-running')).toHaveTextContent('n1');
  await fireEvent.press(screen.getByTestId('count-object-1'));
  expect(screen.getByTestId('count-running')).toHaveTextContent('n1');

  await fireEvent.press(screen.getByTestId('count-object-0'));
  expect(playPack).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('count-object-2'));
  expect(screen.getByTestId('count-running')).toHaveTextContent('n3');
  expect(playPack).toHaveBeenCalledWith('tst-latn', 'audio/numbers/3.m4a');
  expect(screen.getByTestId('celebration')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('celebration'));
  await fireEvent.press(screen.getByTestId('count-again'));
  expect(screen.getByTestId('count-running')).toHaveTextContent(/^\s*$/);
});
