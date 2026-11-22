import { useNavigation } from '@react-navigation/native';
import React, { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PromptId } from '@/audio';
import { common, useStrings } from '@/i18n';
import type { Stars } from '@/progress';
import { colors, spacing } from '@/theme';
import { BigButton, Header, Screen, StarRow } from '@/ui';

import { strings } from '../strings';

import { Celebration } from '@/ui';

type Props = {
  title: string;
  prompt: PromptId;
  testID: string;
  index: number;
  total: number;
  phase: 'play' | 'celebrate' | 'done';
  stars: Stars;
  onCelebrationDone: () => void;
  onRestart: () => void;
  children: ReactNode;
};

/** Game layout: no banner (handover 3.2), round dots, short celebration, then play again. */
export function GameFrame({
  title,
  prompt,
  testID,
  index,
  total,
  phase,
  stars,
  onCelebrationDone,
  onRestart,
  children,
}: Props) {
  const s = useStrings(strings);
  const c = useStrings(common);
  const navigation = useNavigation();

  // Games are hidden when a pack lacks content; if one is opened anyway, quietly go back.
  useEffect(() => {
    if (total === 0 && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [total, navigation]);

  return (
    <Screen prompt={prompt} banner={false} testID={testID}>
      <Header title={title} prompt={prompt} />
      {phase === 'done' ? (
        <View style={styles.result} testID="game-result">
          <StarRow stars={stars} size={56} />
          <BigButton icon="🔁" label={s.playAgain} onPress={onRestart} testID="game-again" />
          <BigButton
            icon="🏠"
            label={c.done}
            variant="surface"
            onPress={() => navigation.goBack()}
            testID="game-done"
          />
        </View>
      ) : (
        <>
          <View
            style={styles.dots}
            accessible
            accessibilityLabel={`${Math.min(index + 1, total)} / ${total}`}
          >
            {Array.from({ length: total }, (_, i) => {
              const done = i < index || phase === 'celebrate';
              return (
                <Text key={i} style={[styles.dot, done && styles.dotDone]}>
                  {done ? '★' : '●'}
                </Text>
              );
            })}
          </View>
          {children}
        </>
      )}
      {phase === 'celebrate' ? (
        <Celebration message={s.finished} prompt="wellDone" onDone={onCelebrationDone} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { fontSize: 24, color: colors.border },
  dotDone: { color: colors.accent },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
});
