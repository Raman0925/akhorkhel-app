import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { audio } from '@/audio';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  /** Big emoji or glyph shown above the label (icons stay readable for pre-readers). */
  icon?: string;
  variant?: 'primary' | 'secondary' | 'surface';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
};

/** Child-sized button: at least 64dp in both directions, plays a tap sound. */
export function BigButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  style,
  accessibilityHint,
  testID,
}: Props) {
  const palette = PALETTES[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        audio.sfx('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <View>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}
      <Text style={[styles.label, { color: palette.fg }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const PALETTES = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primaryDark },
  secondary: { bg: colors.secondary, fg: colors.onSecondary, border: colors.secondary },
  surface: { bg: colors.surface, fg: colors.text, border: colors.border },
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
  icon: { fontSize: 40, textAlign: 'center' },
  label: { fontFamily: fonts.bengaliBold, fontSize: fontSize.md, textAlign: 'center' },
});
