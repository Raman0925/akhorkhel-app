import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { audio } from '@/audio';
import { format, useStrings } from '@/i18n';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';

import {
  appendDigit,
  createChallenge,
  isLocked,
  secondsLeft,
  submit,
  type Challenge,
} from '../challenge';
import { getGateState, setGateState } from '../gateMemory';
import { strings } from '../strings';

type Props = { onPass: () => void };

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Multiplication typed on a keypad. The question text has a stable test ID (`parent-gate-question`)
 * so E2E flows can read it, compute the answer and tap `parent-gate-key-<digit>` + `parent-gate-submit`.
 */
export function GateChallenge({ onPass }: Props) {
  const s = useStrings(strings);
  const [challenge, setChallenge] = useState<Challenge>(() => createChallenge());
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const locked = isLocked(getGateState(), now);
  // Short phones (e.g. 640 dp tall) get 64 dp keys so the whole keypad and ✓ fit without scrolling.
  const compact = useWindowDimensions().height < 720;

  // Tick once a second while the cooldown runs.
  useEffect(() => {
    if (!locked) {
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  const onSubmit = () => {
    const time = Date.now();
    const result = submit(challenge, input, getGateState(), time);
    setGateState(result.state);
    if (result.kind === 'passed') {
      onPass();
      return;
    }
    setChallenge(prev => createChallenge(Math.random, prev));
    setInput('');
    setWrong(result.kind === 'wrong');
    setNow(time);
  };

  const press = (fn: () => void) => () => {
    audio.sfx('tap');
    fn();
  };

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <Text style={styles.instruction}>{s.instruction}</Text>
      <Text style={styles.question} testID="parent-gate-question">
        {format(s.question, { a: challenge.a, b: challenge.b })}
      </Text>
      <Text
        style={styles.answer}
        testID="parent-gate-answer"
        accessibilityLabel={`${s.answerLabel}: ${input}`}
      >
        {input || ' '}
      </Text>
      <Text
        style={[styles.feedback, compact && styles.feedbackCompact]}
        testID="parent-gate-feedback"
        accessibilityLiveRegion="polite"
      >
        {locked ? format(s.locked, { s: secondsLeft(getGateState(), now) }) : wrong ? s.wrong : ' '}
      </Text>
      <View style={[styles.keypad, compact && styles.keypadCompact]}>
        {KEYS.map(d => (
          <Key
            key={d}
            label={String(d)}
            testID={`parent-gate-key-${d}`}
            compact={compact}
            disabled={locked}
            onPress={press(() => setInput(v => appendDigit(v, d)))}
          />
        ))}
        <Key
          label="⌫"
          a11yLabel={s.erase}
          testID="parent-gate-erase"
          compact={compact}
          disabled={locked}
          onPress={press(() => setInput(v => v.slice(0, -1)))}
        />
        <Key
          label="0"
          testID="parent-gate-key-0"
          compact={compact}
          disabled={locked}
          onPress={press(() => setInput(v => appendDigit(v, 0)))}
        />
        <Key
          label="✓"
          a11yLabel={s.submit}
          testID="parent-gate-submit"
          compact={compact}
          disabled={locked || input === ''}
          onPress={press(onSubmit)}
          primary
        />
      </View>
    </View>
  );
}

function Key({
  label,
  a11yLabel,
  testID,
  disabled,
  onPress,
  primary,
  compact,
}: {
  label: string;
  a11yLabel?: string;
  testID: string;
  disabled: boolean;
  onPress: () => void;
  primary?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        compact && styles.keyCompact,
        primary && styles.keyPrimary,
        pressed && styles.keyPressed,
        disabled && styles.keyDisabled,
      ]}
    >
      <Text style={[styles.keyText, primary && styles.keyTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const KEY = MIN_TOUCH + 8;
const KEY_COMPACT = MIN_TOUCH;

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.sm },
  rootCompact: { gap: spacing.xs },
  instruction: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  question: { fontFamily: fonts.latinBold, fontSize: fontSize.xl, color: colors.text },
  answer: {
    minWidth: KEY * 2,
    minHeight: MIN_TOUCH,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: fonts.latinBold,
    fontSize: fontSize.xl,
    color: colors.text,
    borderBottomWidth: 3,
    borderColor: colors.border,
  },
  feedback: {
    minHeight: 48,
    fontFamily: fonts.bengali,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    width: KEY * 3 + spacing.sm * 2,
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
  keyCompact: { width: KEY_COMPACT, height: KEY_COMPACT },
  keypadCompact: { gap: spacing.xs, width: KEY_COMPACT * 3 + spacing.xs * 2 },
  feedbackCompact: { minHeight: 24 },
  keyPrimary: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  keyPressed: { opacity: 0.8 },
  keyDisabled: { opacity: 0.4 },
  keyText: { fontFamily: fonts.latinBold, fontSize: fontSize.xl, color: colors.text },
  keyTextPrimary: { color: colors.onSecondary },
});
