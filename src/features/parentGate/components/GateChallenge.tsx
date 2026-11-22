import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audio } from '@/audio';
import { format, useStrings } from '@/i18n';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';

import {
  createChallenge,
  KEYPAD_DIGITS,
  START,
  tap,
  type Challenge,
  type Digit,
  type GateProgress,
} from '../challenge';
import { strings } from '../strings';

type Props = { onPass: () => void };

type Feedback = 'none' | 'miss' | 'new';

/**
 * Keypad challenge. Keys that belong to the answer carry `parent-gate-step-<n>` test IDs so E2E
 * flows can pass the gate; test IDs are never shown or spoken to the child.
 */
export function GateChallenge({ onPass }: Props) {
  const s = useStrings(strings);
  const [challenge, setChallenge] = useState<Challenge>(() => createChallenge());
  const [progress, setProgress] = useState<GateProgress>(START);
  const [feedback, setFeedback] = useState<Feedback>('none');

  const words = challenge.order.map(d => s[`w${d}`]).join(s.separator);

  const onKey = useCallback(
    (digit: Digit) => {
      const result = tap(challenge, progress, digit);
      switch (result.kind) {
        case 'passed':
          onPass();
          return;
        case 'progress':
          setProgress(result.state);
          setFeedback('none');
          return;
        case 'miss':
          setProgress(result.state);
          setFeedback('miss');
          return;
        case 'newChallenge':
          setChallenge(prev => createChallenge(Math.random, prev));
          setProgress(START);
          setFeedback('new');
      }
    },
    [challenge, progress, onPass],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.instruction}>{s.instruction}</Text>
      <Text style={styles.words} testID="parent-gate-words" accessibilityLiveRegion="polite">
        {words}
      </Text>
      <Text style={styles.progress} testID="parent-gate-progress">
        {format(s.progress, { done: progress.step, total: challenge.order.length })}
      </Text>
      <View style={styles.keypad}>
        {KEYPAD_DIGITS.map(d => {
          const answerIndex = challenge.order.indexOf(d);
          const testID =
            answerIndex >= 0 ? `parent-gate-step-${answerIndex + 1}` : `parent-gate-key-${d}`;
          return (
            <Pressable
              key={d}
              testID={testID}
              accessibilityRole="button"
              accessibilityLabel={String(d)}
              onPress={() => {
                audio.sfx('tap');
                onKey(d);
              }}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Text style={styles.keyText}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.feedback} testID="parent-gate-feedback">
        {feedback === 'miss' ? s.tryAgain : feedback === 'new' ? s.newChallenge : ' '}
      </Text>
    </View>
  );
}

const KEY = MIN_TOUCH + 16;

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.sm },
  instruction: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  words: {
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.xl,
    color: colors.text,
    textAlign: 'center',
  },
  progress: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    width: KEY * 3 + spacing.md * 2,
    marginTop: spacing.sm,
  },
  key: {
    width: KEY,
    height: KEY,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.surfaceAlt },
  keyText: { fontFamily: fonts.latinBold, fontSize: fontSize.xl, color: colors.text },
  feedback: {
    minHeight: 48,
    fontFamily: fonts.bengali,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
