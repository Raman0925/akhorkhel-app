import React, { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { colors, MIN_TOUCH, radius } from '@/theme';

type Props = {
  children: ReactNode;
  label: string;
  onPress: () => void;
  /** Increase to play a gentle wiggle (a wrong answer). 0 = never wiggled. */
  wiggle: number;
  /** Highlight after a correct answer (green border, never red for wrong ones). */
  correct?: boolean;
  size: number;
  testID?: string;
};

/** A big answer tile. Wrong answers wiggle softly; there is no red and no cross. */
export function ChoiceTile({ children, label, onPress, wiggle, correct, size, testID }: Props) {
  const [x] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (wiggle === 0) {
      return;
    }
    const step = (toValue: number) =>
      Animated.timing(x, { toValue, duration: 60, useNativeDriver: true });
    Animated.sequence([step(10), step(-10), step(8), step(-8), step(0)]).start();
  }, [wiggle, x]);

  const side = Math.max(size, MIN_TOUCH);
  return (
    <Animated.View style={{ transform: [{ translateX: x }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          styles.tile,
          { width: side, height: side },
          correct && styles.correct,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correct: { borderColor: colors.secondary, backgroundColor: colors.surfaceAlt },
  pressed: { transform: [{ scale: 0.95 }] },
});
