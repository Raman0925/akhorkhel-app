import { useNavigation } from '@react-navigation/native';
import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { audio, usePromptAvailable, type PromptId } from '@/audio';
import { common, useStrings } from '@/i18n';
import { colors, fonts, fontSize, spacing } from '@/theme';

import { IconButton } from './IconButton';

type Props = {
  title: string;
  /** Replays this voice prompt when the speaker is tapped (no speaker until it is recorded). */
  prompt?: PromptId;
  showBack?: boolean;
  right?: ReactNode;
};

/** Top bar: back, title, speaker (replay the voice prompt). */
export function Header({ title, prompt, showBack = true, right }: Props) {
  const navigation = useNavigation();
  const s = useStrings(common);
  // No recording for this prompt yet (ADR 0004): no speaker, rather than a silent button.
  const canReplay = usePromptAvailable(prompt);
  return (
    <View style={styles.row}>
      {showBack && navigation.canGoBack() ? (
        <IconButton
          icon="⬅️"
          label={s.back}
          onPress={() => navigation.goBack()}
          testID="header-back"
        />
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right ??
        (prompt && canReplay ? (
          <IconButton
            icon="🔊"
            label={s.play}
            onPress={() => audio.playPrompt(prompt)}
            testID="header-speaker"
          />
        ) : (
          <View style={styles.spacer} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  spacer: { width: 64, height: 64 },
});
