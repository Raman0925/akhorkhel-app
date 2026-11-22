import React, { useCallback } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { audio } from '@/audio';
import { useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fontForScript, spacing } from '@/theme';
import { usePack } from '@/ui';

import { ChoiceTile } from '../components/ChoiceTile';
import { GameFrame } from '../components/GameFrame';
import { useGame } from '../components/useGame';
import { WordPicture } from '@/ui';
import { picturePool } from '../logic/availability';
import { makePictureRounds, type PictureRound } from '../logic/rounds';
import { strings } from '../strings';

/** "Which picture starts with this sound?" */
export function GamePictureScreen(_props: ScreenProps<'GamePicture'>) {
  const pack = usePack();
  const s = useStrings(strings);
  const { width } = useWindowDimensions();
  const makeRounds = useCallback(
    () => makePictureRounds(picturePool(pack), pack.letters, Math.random),
    [pack],
  );
  const playSound = useCallback(
    (r: PictureRound) => audio.playPack(pack.id, r.letter.audio),
    [pack.id],
  );
  const game = useGame(makeRounds, 'game:picture', playSound);
  const round = game.round;
  const tile = Math.min(140, (width - spacing.md * 4) / 3);

  return (
    <GameFrame
      title={s.pictureTitle}
      prompt="gamePicture"
      testID="screen-GamePicture"
      index={game.index}
      total={game.total}
      phase={game.phase}
      stars={game.stars}
      onCelebrationDone={game.endCelebration}
      onRestart={game.restart}
    >
      {round ? (
        <View style={styles.body}>
          <ChoiceTile
            label={`${s.listenAgain} ${round.letter.glyph}`}
            size={140}
            wiggle={0}
            onPress={game.replay}
            testID="game-listen"
          >
            <Text style={[styles.glyph, { fontFamily: fontForScript(pack.script, true) }]}>
              {round.letter.glyph}
            </Text>
            <Text style={styles.speaker}>🔊</Text>
          </ChoiceTile>
          <View style={styles.choices}>
            {round.choices.map(word => (
              <ChoiceTile
                key={`${game.index}-${word.id}`}
                label={word.text}
                size={tile}
                wiggle={game.wrong.id === word.id ? game.wrong.n : 0}
                correct={game.solved === word.id}
                onPress={() => {
                  const correct = word.id === round.answer.id;
                  game.answer(word.id, correct);
                  if (correct) {
                    // Hear the whole word that starts with the sound.
                    audio.playPack(pack.id, word.audio);
                  }
                }}
                testID={`choice-${word.id}`}
              >
                <WordPicture packId={pack.id} word={word} size={tile * 0.8} />
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
  choices: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  glyph: { fontSize: 72, color: colors.text },
  speaker: { fontSize: 24 },
});
