import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { format, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { bestStars, useProfiles, usePackProgress } from '@/progress';
import { colors, fontForScript, fonts, fontSize, radius, spacing } from '@/theme';
import { BigButton, Header, Screen, StarRow, usePack } from '@/ui';

import { avatarEmoji } from '../avatars';
import { Tabs } from '../components/Tabs';
import { sumStars } from '../report';
import { strings } from '../strings';
import { useTabs } from '../useTabs';

/** One child's stars per item, plus quick switching to that child. */
export function TeacherChildScreen({ navigation, route }: ScreenProps<'TeacherChild'>) {
  const s = useStrings(strings);
  const pack = usePack();
  const { profileId } = route.params;
  const profile = useProfiles(st => st.profiles.find(p => p.id === profileId));
  const items = usePackProgress(profile?.id ?? null, pack.id);
  const { tabs, tab, setTab, columns } = useTabs(pack);
  const font = fontForScript(pack.script, true);

  if (!profile) {
    return (
      <Screen testID="screen-TeacherChild">
        <Header title={s.title} />
        <Text style={styles.message}>{s.notFound}</Text>
      </Screen>
    );
  }

  const stars = columns.map(c => bestStars(items[c.key]));
  const tried = columns.filter(c => (items[c.key]?.attempts ?? 0) > 0).length;

  return (
    <Screen testID="screen-TeacherChild" banner>
      <Header title={format(s.childTitle, { name: profile.nickname })} />
      <View style={styles.summary}>
        <Text style={styles.avatar}>{avatarEmoji(profile.avatar)}</Text>
        <Text style={styles.summaryText} testID="teacher-child-summary">
          {format(s.starsSummary, { stars: sumStars(stars), done: tried, total: columns.length })}
        </Text>
      </View>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <ScrollView contentContainerStyle={styles.grid}>
        {columns.length === 0 ? <Text style={styles.message}>{s.noItems}</Text> : null}
        {columns.map((c, i) => (
          <View key={c.key} style={styles.item}>
            <Text style={[styles.glyph, { fontFamily: font }]}>{c.label}</Text>
            <StarRow stars={stars[i] ?? 0} size={16} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <BigButton
          label={s.switchToChild}
          icon={avatarEmoji(profile.avatar)}
          onPress={() => {
            useProfiles.getState().selectProfile(profile.id);
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          }}
          testID="teacher-switch"
        />
        <BigButton
          label={s.editChild}
          variant="surface"
          onPress={() => navigation.navigate('ProfileEdit', { profileId: profile.id })}
          testID="teacher-edit"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: { fontSize: 48 },
  summaryText: { flex: 1, fontFamily: fonts.bengali, fontSize: fontSize.md, color: colors.text },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  item: {
    width: 72,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glyph: { fontSize: fontSize.lg, color: colors.text },
  message: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
