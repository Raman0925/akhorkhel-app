import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { audio, type PromptId } from '@/audio';
import { useActiveStickers } from '@/monetization';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';

type Props = {
  message: string;
  /** Voice prompt played with the chime (e.g. setComplete). */
  prompt?: PromptId;
  /** `byTap` is true when the child tapped it away, false when it ended on its own. */
  onDone: (byTap: boolean) => void;
  durationMs?: number;
  testID?: string;
};

/** Short, happy overlay with stickers. Ends by itself or on tap; never blocks the lesson. */
export function Celebration({ message, prompt, onDone, durationMs = 2500, testID }: Props) {
  const stickers = useActiveStickers().slice(0, 5);
  const [scale] = useState(() => new Animated.Value(0));
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    audio.sfx('success');
    if (prompt) {
      audio.playPrompt(prompt);
    }
    // Native-driven pop-in: no per-frame JS work.
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    const t = setTimeout(() => done.current(false), durationMs);
    return () => clearTimeout(t);
  }, [prompt, durationMs, scale]);

  return (
    <Pressable
      style={styles.overlay}
      onPress={() => done.current(true)}
      accessibilityRole="button"
      accessibilityLabel={message}
      testID={testID ?? 'celebration'}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={styles.stickers}>
          {stickers.map((emoji, i) => (
            <Text key={`${emoji}-${i}`} style={styles.sticker}>
              {emoji}
            </Text>
          ))}
        </View>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 248, 236, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  stickers: { flexDirection: 'row', gap: spacing.sm },
  sticker: { fontSize: 56 },
  message: { fontFamily: fonts.bengaliBold, fontSize: fontSize.xl, color: colors.text },
});
