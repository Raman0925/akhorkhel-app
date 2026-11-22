import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { audio } from '@/audio';
import { colors, MIN_TOUCH } from '@/theme';

type Props = {
  icon: string;
  /** Spoken by screen readers; required because the icon has no text. */
  label: string;
  onPress: () => void;
  testID?: string;
  size?: number;
};

/** Round icon-only button (back, speaker, parents). Always ≥ 64dp. */
export function IconButton({ icon, label, onPress, testID, size = MIN_TOUCH }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={8}
      onPress={() => {
        audio.sfx('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { width: Math.max(size, MIN_TOUCH), height: Math.max(size, MIN_TOUCH) },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.92 }] },
  icon: { fontSize: 30 },
});
