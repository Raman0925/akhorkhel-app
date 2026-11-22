import { fireEvent, screen } from '@testing-library/react-native';

import { audio } from '@/audio';
import { mockAudio } from '@/audio/testing';

import { fixturePack } from '../__fixtures__/pack';
import { renderScreen, resetStores } from '../__fixtures__/render';
import { WordListScreen } from '../screens/WordListScreen';
import { WordScreen } from '../screens/WordScreen';

const mockPack = fixturePack();
jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));

beforeEach(() => {
  resetStores();
});

describe('WordList', () => {
  it('shows pictures with a banner and opens a word', async () => {
    await renderScreen('WordList', WordListScreen, undefined, ['Word']);
    expect(screen.getByTestId('banner-slot')).toBeTruthy();
    expect(screen.getAllByText('🟢').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('word-tile-one'));
    expect(await screen.findByTestId('screen-Word')).toHaveTextContent('{"wordId":"one"}');
  });
});

describe('Word', () => {
  it('plays the word, has no banner and no bridge card without bridge data', async () => {
    const playPack = jest.spyOn(audio, 'playPack');
    await renderScreen('Word', WordScreen, { wordId: 'one' });
    expect(playPack).toHaveBeenCalledWith('tst-latn', 'audio/words/one.m4a');
    expect(screen.queryByTestId('banner-slot')).toBeNull();
    expect(screen.queryByTestId('word-bridge')).toBeNull();
    await fireEvent.press(screen.getByTestId('word-picture'));
    expect(playPack).toHaveBeenCalledTimes(2);
  });

  it('shows the listen button when the word is recorded', async () => {
    await renderScreen('Word', WordScreen, { wordId: 'one' });
    expect(screen.getByTestId('word-listen')).toBeTruthy();
  });

  it('hides the listen button when the word is not recorded', async () => {
    mockAudio('none');
    await renderScreen('Word', WordScreen, { wordId: 'one' });
    expect(screen.queryByTestId('word-listen')).toBeNull();
    expect(screen.getByLabelText('one')).toBeTruthy();
  });

  it('WordList has no speaker without a recorded prompt', async () => {
    mockAudio('none');
    await renderScreen('WordList', WordListScreen);
    expect(screen.queryByTestId('header-speaker')).toBeNull();
    expect(screen.getByTestId('word-tile-one')).toBeTruthy();
  });

  it('shows the bridge card with Assamese and English', async () => {
    await renderScreen('Word', WordScreen, { wordId: 'two' });
    const bridge = screen.getByTestId('word-bridge');
    expect(bridge).toHaveTextContent(/bridge-as/);
    expect(bridge).toHaveTextContent(/bridge-en/);
    expect(bridge).toHaveTextContent(/Assamese/);
  });
});
