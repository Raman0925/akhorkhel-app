import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fonts, fontSize, spacing } from '@/theme';
import { Header, IconButton, Screen } from '@/ui';

import { GateChallenge } from '../components/GateChallenge';
import { strings } from '../strings';

/** Child-proof check before any grown-up area. On success it replaces itself with `next`. */
export function ParentGateScreen({ navigation, route }: ScreenProps<'ParentGate'>) {
  const s = useStrings(strings);
  const { next } = route.params;
  const onPass = useCallback(() => navigation.replace(next), [navigation, next]);

  return (
    <Screen testID="screen-ParentGate" prompt="askParent">
      <Header
        title={s.title}
        showBack={false}
        right={
          <IconButton
            icon="✖️"
            label={s.close}
            onPress={() => navigation.goBack()}
            testID="parent-gate-close"
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.ask}>{s.askGrownUp}</Text>
        <GateChallenge onPass={onPass} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.md },
  ask: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
