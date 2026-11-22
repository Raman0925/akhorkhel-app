import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '@/i18n';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';

import type { TabId } from '../report';
import { strings } from '../strings';

/** Letters / vowel signs / numbers tabs (only the ones the pack has). */
export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly TabId[];
  value: TabId;
  onChange: (t: TabId) => void;
}) {
  const s = useStrings(strings);
  if (tabs.length < 2) {
    return null;
  }
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map(t => {
        const selected = t === value;
        return (
          <Pressable
            key={t}
            testID={`teacher-tab-${t}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(t)}
            style={[styles.tab, selected && styles.selected]}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{s[t]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  selected: { backgroundColor: colors.sky, borderColor: colors.sky },
  text: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.text },
  textSelected: { color: colors.onPrimary },
});
