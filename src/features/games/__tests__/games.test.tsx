import { act, fireEvent, screen } from '@testing-library/react-native';

import { audio } from '@/audio';
import { useProgress } from '@/progress';

import { fixturePack, letter, word } from '../__fixtures__/pack';
import { PROFILE_ID, renderScreen, resetStores } from '../__fixtures__/render';
import { GameHearScreen } from '../screens/GameHearScreen';
import { GamePictureScreen } from '../screens/GamePictureScreen';
import { GamesHubScreen } from '../screens/GamesHubScreen';

let mockPack = fixturePack();
jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));

const playPack = jest.spyOn(audio, 'playPack');

beforeEach(() => {
  mockPack = fixturePack();
  resetStores();
  playPack.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

/** Id of the item whose audio played last, e.g. audio/letters/b.m4a -> b. */
function lastPlayedId(): string {
  const path = playPack.mock.calls[playPack.mock.calls.length - 1]?.[1] ?? '';
  return path.replace(/^.*\/([a-z0-9]+)\.m4a$/, '$1');
}

describe('GamesHub', () => {
  it('lists playable games without a banner', async () => {
    await renderScreen('GamesHub', GamesHubScreen, undefined, ['GameHear', 'GamePicture']);
    expect(screen.queryByTestId('banner-slot')).toBeNull();
    await fireEvent.press(screen.getByTestId('games-picture'));
    expect(await screen.findByTestId('screen-GamePicture')).toBeTruthy();
  });

  it('hides the picture game without enough pictured words', async () => {
    mockPack = fixturePack({ words: [word('a1', 'a'), word('b1', 'b', { bonus: true })] });
    await renderScreen('GamesHub', GamesHubScreen);
    expect(screen.getByTestId('games-hear')).toBeTruthy();
    expect(screen.queryByTestId('games-picture')).toBeNull();
  });
});

describe('GameHear', () => {
  it('plays 5 rounds: wrong = replay, right = next; then celebrates and records stars', async () => {
    await renderScreen('GameHear', GameHearScreen);
    expect(screen.queryByTestId('banner-slot')).toBeNull();
    // 4 letters in the pack -> 3 choices.
    expect(screen.getAllByTestId(/^choice-/)).toHaveLength(3);

    for (let round = 0; round < 5; round++) {
      await advance(2000);
      const target = lastPlayedId();
      if (round === 0) {
        const wrong = screen
          .getAllByTestId(/^choice-/)
          .find(el => el.props.testID !== `choice-${target}`)!;
        const calls = playPack.mock.calls.length;
        await fireEvent.press(wrong);
        expect(playPack.mock.calls.length).toBe(calls + 1);
        expect(lastPlayedId()).toBe(target);
      }
      await fireEvent.press(screen.getByTestId(`choice-${target}`));
      await advance(1100);
    }

    expect(screen.getByTestId('celebration')).toBeTruthy();
    const item = useProgress.getState().progress[PROFILE_ID]?.[mockPack.id]?.['game:hear'];
    expect(item?.best[0]).toBe(3);

    await fireEvent.press(screen.getByTestId('celebration'));
    expect(screen.getByTestId('game-result')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('game-again'));
    expect(screen.getAllByTestId(/^choice-/)).toHaveLength(3);
  });

  it('uses 2 choices for a 2-letter pack', async () => {
    mockPack = fixturePack({ letters: [letter('a'), letter('b')] });
    await renderScreen('GameHear', GameHearScreen);
    expect(screen.getAllByTestId(/^choice-/)).toHaveLength(2);
  });
});

describe('GamePicture', () => {
  it('plays the letter sound and accepts the picture that starts with it', async () => {
    await renderScreen('GamePicture', GamePictureScreen);
    expect(screen.queryByTestId('banner-slot')).toBeNull();
    await advance(2000);
    const target = lastPlayedId();
    expect(screen.getAllByTestId(/^choice-/)).toHaveLength(3);

    await fireEvent.press(screen.getByTestId(`choice-${target}1`));
    expect(playPack).toHaveBeenLastCalledWith(mockPack.id, `audio/words/${target}1.m4a`);
    await advance(1500);
    expect(lastPlayedId()).not.toBe(target);
  });
});
