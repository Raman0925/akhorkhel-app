import React, { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';

type State = { hasError: boolean };

/** Last-resort screen: friendly, no technical text, one big "try again" button. No crash reporting (no SDKs). */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <View style={styles.root}>
        <Text style={styles.emoji}>🦏</Text>
        <Text style={styles.text}>আকৌ চেষ্টা কৰক · Let's try again</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => this.setState({ hasError: false })}
        >
          <Text style={styles.buttonText}>↻</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  emoji: { fontSize: 96 },
  text: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  button: {
    minWidth: MIN_TOUCH * 1.5,
    minHeight: MIN_TOUCH,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.onPrimary, fontSize: 32 },
});
