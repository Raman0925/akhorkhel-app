import { fireEvent, screen } from '@testing-library/react-native';

import { audio } from '@/audio';
import { useProgress } from '@/progress';

import { fixturePack } from '../__fixtures__/pack';
import { PROFILE_ID, renderScreen, resetStores } from '../__fixtures__/render';
import { LetterScreen } from '../screens/LetterScreen';

const mockPack = fixturePack();
jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));

beforeEach(resetStores);

it('plays the letter, shows the example word and has no banner', async () => {
  const playPack = jest.spyOn(audio, 'playPack');
  await renderScreen('Letter', LetterScreen, { letterId: 'a' });
  expect(screen.getByTestId('letter-glyph')).toHaveTextContent('A');
  expect(playPack).toHaveBeenCalledWith('tst-latn', 'audio/letters/a.m4a');
  expect(screen.queryByTestId('banner-slot')).toBeNull();

  await fireEvent.press(screen.getByTestId('letter-example'));
  expect(playPack).toHaveBeenLastCalledWith('tst-latn', 'audio/words/apple.m4a');
  expect(screen.getByText('🍎')).toBeTruthy();
});

it('moves to the next and previous letters', async () => {
  await renderScreen('Letter', LetterScreen, { letterId: 'a' });
  expect(screen.queryByTestId('letter-prev')).toBeNull();
  await fireEvent.press(screen.getByTestId('letter-next'));
  expect(screen.getByTestId('letter-glyph')).toHaveTextContent('E');
  expect(screen.queryByTestId('letter-example')).toBeNull();
  await fireEvent.press(screen.getByTestId('letter-prev'));
  expect(screen.getByTestId('letter-glyph')).toHaveTextContent('A');
});

it('picks a trace level showing stars per level and opens Trace', async () => {
  useProgress.getState().record(PROFILE_ID, mockPack.id, 'letter:b', 2, 3);
  await renderScreen('Letter', LetterScreen, { letterId: 'b' }, ['Trace']);
  await fireEvent.press(screen.getByTestId('letter-trace'));
  expect(screen.getByTestId('trace-level-2')).toHaveTextContent(/2/);
  expect(screen.getAllByLabelText('3 / 3')).toHaveLength(1);

  await fireEvent.press(screen.getByTestId('trace-level-2'));
  expect(await screen.findByTestId('screen-Trace')).toHaveTextContent(
    '{"itemKey":"letter:b","level":2}',
  );
});
