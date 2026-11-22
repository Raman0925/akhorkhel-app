import { fireEvent, screen } from '@testing-library/react-native';

import { useProfiles } from '@/progress';

import { fixturePack, letter } from '../__fixtures__/pack';
import { renderScreen, resetStores } from '../__fixtures__/render';
import { visibleModules } from '../logic/modules';
import { HomeScreen } from '../screens/HomeScreen';

let mockPack = fixturePack();
jest.mock('@/ui/usePack', () => ({ usePack: () => mockPack }));

beforeEach(() => {
  mockPack = fixturePack();
  resetStores();
});

describe('visibleModules', () => {
  it('shows every module that has content', () => {
    expect(visibleModules(fixturePack()).map(m => m.id)).toEqual([
      'letters',
      'signs',
      'games',
      'words',
      'numbers',
    ]);
  });

  it('hides modules without content', () => {
    const pack = fixturePack({ letters: [letter('a')], signs: [], words: [], numbers: [] });
    expect(visibleModules(pack).map(m => m.id)).toEqual(['letters']);
    expect(visibleModules(fixturePack({ letters: [] })).map(m => m.id)).not.toContain('games');
  });
});

describe('HomeScreen', () => {
  it('shows the pack, module tiles and a banner', async () => {
    await renderScreen('Home', HomeScreen, undefined, ['LetterGrid']);
    expect(screen.getByText('Native')).toBeTruthy();
    expect(screen.getByTestId('home-pack')).toHaveTextContent('Learning Testish');
    expect(screen.getByTestId('banner-slot')).toBeTruthy();
    expect(screen.getByText('🦏')).toBeTruthy();
    expect(screen.getByTestId('home-numbers')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('home-letters'));
    expect(await screen.findByTestId('screen-LetterGrid')).toBeTruthy();
  });

  it('hides empty modules', async () => {
    mockPack = fixturePack({ signs: [], numbers: [] });
    await renderScreen('Home', HomeScreen);
    expect(screen.getByTestId('home-letters')).toBeTruthy();
    expect(screen.queryByTestId('home-signs')).toBeNull();
    expect(screen.queryByTestId('home-numbers')).toBeNull();
  });

  it('opens the profile picker from the avatar', async () => {
    useProfiles.setState(s => ({
      profiles: s.profiles.map(p => ({ ...p, avatar: 'tiger' as const })),
    }));
    await renderScreen('Home', HomeScreen, undefined, ['ProfilePicker']);
    expect(screen.getByText('🐅')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-avatar'));
    expect(await screen.findByTestId('screen-ProfilePicker')).toBeTruthy();
  });

  it('sends the parents button through the parent gate', async () => {
    await renderScreen('Home', HomeScreen, undefined, ['ParentGate']);
    await fireEvent.press(screen.getByTestId('home-parents'));
    expect(await screen.findByTestId('screen-ParentGate')).toHaveTextContent(
      '{"next":"ParentArea"}',
    );
  });
});
