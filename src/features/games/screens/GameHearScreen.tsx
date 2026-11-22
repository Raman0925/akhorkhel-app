import React, { useCallback } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { audio } from '@/audio';
import { useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fontForScript, spacing } from '@/theme';
import { BigButton, usePack } from '@/ui';

import { ChoiceTile } from '../components/ChoiceTile';
import { GameFrame } from '../components/GameFrame';
import { useGame } from '../components/useGame';
import { makeHearRounds, type HearRound } from '../logic/rounds';
import { strings } from '../strings';

/** "Tap the letter you hear." */
export function GameHearScreen(_props: ScreenProps<'GameHear'>) {
  const pack = usePack();
  const s = useStrings(strings);
  const { width } = useWindowDimensions();
  const makeRounds = useCallback(() => makeHearRounds(pack.letters, Math.random), [pack.letters]);
  const playSound = useCallback(
    (r: HearRound) => audio.playPack(pack.id, r.target.audio),
    [pack.id],
  );
  const game = useGame(makeRounds, 'game:hear', playSound);
  const round = game.round;
  const tile = Math.min(150, (width - spacing.md * 3) / 2);
  const font = fontForScript(pack.script, true);

  return (
    <GameFrame
      title={s.hearTitle}
      prompt="gameHear"
      testID="screen-GameHear"
      index={game.index}
      total={game.total}
      phase={game.phase}
      stars={game.stars}
      onCelebrationDone={game.endCelebration}
      onRestart={game.restart}
    >
      {round ? (
        <View style={styles.body}>
          <BigButton
            icon="🔊"
            label={s.listenAgain}
            variant="secondary"
            onPress={game.replay}
            testID="game-listen"
          />
          <View style={styles.choices}>
            {round.choices.map(choice => (
              <ChoiceTile
                key={`${game.index}-${choice.id}`}
                label={choice.glyph}
                size={tile}
                wiggle={game.wrong.id === choice.id ? game.wrong.n : 0}
                correct={game.solved === choice.id}
                onPress={() => game.answer(choice.id, choice.id === round.target.id)}
                testID={`choice-${choice.id}`}
              >
                <Text style={[styles.glyph, { fontFamily: font, fontSize: tile * 0.55 }]}>
                  {choice.glyph}
                </Text>
              </ChoiceTile>
            ))}
          </View>
        </View>
      ) : null}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center' },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  glyph: { color: colors.text },
});
