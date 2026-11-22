import { act, fireEvent, screen } from '@testing-library/react-native';

import { audio } from '@/audio';
import { useProgress } from '@/progress';
import { useSettings } from '@/storage/settings';

import { fixturePack } from '../__fixtures__/pack';
import { PROFILE_ID, renderScreen, resetStores } from '../__fixtures__/render';
import { LetterGridScreen } from '../screens/LetterGridScreen';

const mockPack = fixturePack();
const mockOnSetComplete = jest.fn(() => Promise.resolve());

jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));
jest.mock('@/monetization', () => ({
  ...jest.requireActual('@/monetization'),
  useAds: () => ({ onSetComplete: mockOnSetComplete }),
}));

beforeEach(() => {
  resetStores();
  useSettings.setState({ completedSessions: 0 });
  mockOnSetComplete.mockClear();
});

it('shows letters by section with a banner and opens a letter', async () => {
  const preload = jest.spyOn(audio, 'preload');
  await renderScreen('LetterGrid', LetterGridScreen, undefined, ['Letter']);
  expect(screen.getByText('Vowels')).toBeTruthy();
  expect(screen.getByText('Consonants')).toBeTruthy();
  expect(screen.queryByText('Other letters')).toBeNull();
  expect(screen.getByTestId('banner-slot')).toBeTruthy();
  expect(preload).toHaveBeenCalled();

  await fireEvent.press(screen.getByTestId('letter-tile-b'));
  expect(await screen.findByTestId('screen-Letter')).toHaveTextContent('{"letterId":"b"}');
});

it('celebrates a set of 5 traced letters on return, counts a session, then asks the ads module', async () => {
  await renderScreen('LetterGrid', LetterGridScreen, undefined, ['Letter']);
  await fireEvent.press(screen.getByTestId('letter-tile-a'));
  await screen.findByTestId('screen-Letter');

  const record = useProgress.getState().record;
  await act(async () => {
    // A letter traced twice still counts once.
    ['a', 'a', 'b', 'c', 'd'].forEach(id => record(PROFILE_ID, mockPack.id, `letter:${id}`, 1, 2));
  });
  expect(screen.queryByTestId('celebration')).toBeNull();
  await act(async () => {
    record(PROFILE_ID, mockPack.id, 'letter:e', 1, 3);
  });

  await fireEvent.press(screen.getByTestId('stub-back'));
  expect(await screen.findByTestId('celebration')).toBeTruthy();
  expect(useSettings.getState().completedSessions).toBe(1);
  expect(mockOnSetComplete).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByTestId('celebration'));
  expect(screen.queryByTestId('celebration')).toBeNull();
  expect(mockOnSetComplete).toHaveBeenCalledTimes(1);
});

it('does not celebrate fewer than 5 new letters', async () => {
  await renderScreen('LetterGrid', LetterGridScreen, undefined, ['Letter']);
  await fireEvent.press(screen.getByTestId('letter-tile-a'));
  await screen.findByTestId('screen-Letter');
  await act(async () => {
    ['a', 'b', 'c'].forEach(id =>
      useProgress.getState().record(PROFILE_ID, mockPack.id, `letter:${id}`, 1, 1),
    );
  });
  await fireEvent.press(screen.getByTestId('stub-back'));
  await screen.findByTestId('letter-tile-a');
  expect(screen.queryByTestId('celebration')).toBeNull();
  expect(useSettings.getState().completedSessions).toBe(0);
});
