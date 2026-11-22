import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audio } from '@/audio';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';

/** A titled card grouping parent-area rows. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Full-width tappable row (≥ 64dp) with an icon, label and optional detail on the right. */
export function Row({
  icon,
  label,
  detail,
  onPress,
  testID,
}: {
  icon: string;
  label: string;
  detail?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={() => {
        audio.sfx('tap');
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel} numberOfLines={2}>
        {label}
      </Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

/** Pick one of a few options (segmented buttons, each ≥ 64dp). */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.choices}>
      {options.map(o => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            testID={`${testIDPrefix}-${o.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => {
              audio.sfx('tap');
              onChange(o.id);
            }}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** On/off setting as a ≥ 64dp row (bigger than a native Switch). */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  onLabel,
  offLabel,
  testID,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={() => {
        audio.sfx('tap');
        onChange(!value);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.toggleText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.pill, value && styles.pillOn]}>
        <Text style={[styles.pillText, value && styles.pillTextOn]}>
          {value ? onLabel : offLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export function Paragraph({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <Text style={styles.paragraph} testID={testID}>
      {children}
    </Text>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.heading} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.bengaliBold, fontSize: fontSize.md, color: colors.text },
  row: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  rowIcon: { fontSize: 28, width: 40, textAlign: 'center' },
  rowLabel: { flex: 1, fontFamily: fonts.bengali, fontSize: fontSize.md, color: colors.text },
  rowDetail: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  chevron: { fontSize: fontSize.lg, color: colors.textMuted },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH * 1.5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceSelected: { backgroundColor: colors.sky, borderColor: colors.sky },
  choiceText: { fontFamily: fonts.bengali, fontSize: fontSize.md, color: colors.text },
  choiceTextSelected: { color: colors.onPrimary },
  toggleText: { flex: 1, paddingVertical: spacing.sm },
  hint: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  pill: {
    minWidth: 72,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  pillOn: { backgroundColor: colors.secondary },
  pillText: { fontFamily: fonts.bengaliBold, fontSize: fontSize.sm, color: colors.text },
  pillTextOn: { color: colors.onSecondary },
  paragraph: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.text,
  },
  heading: {
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
});
