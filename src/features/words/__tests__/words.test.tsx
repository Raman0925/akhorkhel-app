import { fireEvent, screen } from '@testing-library/react-native';

import { audio } from '@/audio';

import { fixturePack } from '../__fixtures__/pack';
import { renderScreen, resetStores } from '../__fixtures__/render';
import { WordListScreen } from '../screens/WordListScreen';
import { WordScreen } from '../screens/WordScreen';

const mockPack = fixturePack();
let mockBonusOpen = false;
jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));
jest.mock('@/monetization', () => ({
  ...jest.requireActual('@/monetization'),
  useUnlocks: () => ({
    isUnlocked: (id: string) => id === 'bonusWords' && mockBonusOpen,
    unlockedUntil: () => 0,
    watchRewarded: async () => false,
    rewardedReady: false,
  }),
}));

beforeEach(() => {
  resetStores();
  mockBonusOpen = false;
});

describe('WordList', () => {
  it('shows pictures with a banner and opens a word', async () => {
    await renderScreen('WordList', WordListScreen, undefined, ['Word']);
    expect(screen.getByTestId('banner-slot')).toBeTruthy();
    expect(screen.getAllByText('🟢').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('word-tile-one'));
    expect(await screen.findByTestId('screen-Word')).toHaveTextContent('{"wordId":"one"}');
  });

  it('shows a lock on bonus words and does nothing when tapped', async () => {
    await renderScreen('WordList', WordListScreen, undefined, ['Word']);
    expect(screen.getByLabelText('extra, Locked')).toBeTruthy();
    expect(screen.getByText('🔒')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('word-tile-extra'));
    expect(screen.queryByTestId('screen-Word')).toBeNull();
  });

  it('opens bonus words once a grown-up unlocked them', async () => {
    mockBonusOpen = true;
    await renderScreen('WordList', WordListScreen, undefined, ['Word']);
    expect(screen.queryByText('🔒')).toBeNull();
    await fireEvent.press(screen.getByTestId('word-tile-extra'));
    expect(await screen.findByTestId('screen-Word')).toBeTruthy();
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

  it('shows the bridge card with Assamese and English', async () => {
    await renderScreen('Word', WordScreen, { wordId: 'two' });
    const bridge = screen.getByTestId('word-bridge');
    expect(bridge).toHaveTextContent(/bridge-as/);
    expect(bridge).toHaveTextContent(/bridge-en/);
    expect(bridge).toHaveTextContent(/Assamese/);
  });
});
