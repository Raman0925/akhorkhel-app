import React, { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { audio, type PromptId } from '@/audio';
import { BannerSlot } from '@/monetization';
import { colors, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  /** Voice prompt played when the screen opens (voice-first navigation). */
  prompt?: PromptId;
  /**
   * Menu screens show the bottom banner (its space is always reserved).
   * Tracing and game screens must pass `false` (handover 3.2).
   */
  banner?: boolean;
  /** Extra padding around content. */
  padded?: boolean;
  testID?: string;
};

/** Base layout for every screen: safe area, background, optional voice prompt and banner slot. */
export function Screen({ children, prompt, banner = false, padded = true, testID }: Props) {
  useEffect(() => {
    if (prompt) {
      audio.playPrompt(prompt);
    }
    return () => audio.stop();
  }, [prompt]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']} testID={testID}>
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
      {banner ? <BannerSlot /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  padded: { padding: spacing.md },
});
