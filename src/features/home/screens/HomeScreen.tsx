import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { audio } from '@/audio';
import { common, format, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { useCurrentProfile } from '@/progress';
import { useSettings } from '@/storage/settings';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';
import { avatarEmoji, IconButton, Screen, usePack } from '@/ui';

import { visibleModules, type HomeModule, type ModuleId } from '../logic/modules';
import { strings } from '../strings';

const TILE_COLORS: Record<ModuleId, string> = {
  letters: colors.primary,
  signs: colors.sky,
  games: colors.secondary,
  words: colors.accent,
  numbers: colors.primaryDark,
};

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const pack = usePack();
  const c = useStrings(common);
  const s = useStrings(strings);
  const uiLanguage = useSettings(st => st.uiLanguage);
  const profile = useCurrentProfile();
  const modules = useMemo(() => visibleModules(pack), [pack]);
  const languageName = uiLanguage === 'en' ? pack.language.nameEn : pack.language.nameAs;
  const label: Record<ModuleId, string> = {
    letters: c.letters,
    signs: c.signs,
    games: c.games,
    words: c.words,
    numbers: c.numbers,
  };

  const renderTile = ({ item }: { item: HomeModule }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label[item.id]}
      testID={`home-${item.id}`}
      onPress={() => {
        audio.sfx('tap');
        navigation.navigate(item.route);
      }}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: TILE_COLORS[item.id] },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.tileIcon}>{item.icon}</Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label[item.id]}
      </Text>
    </Pressable>
  );

  return (
    <Screen prompt="home" banner testID="screen-Home">
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profile ? `${s.changeChild}: ${profile.nickname}` : s.changeChild}
          testID="home-avatar"
          onPress={() => {
            audio.sfx('tap');
            navigation.navigate('ProfilePicker');
          }}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarEmoji}>{profile ? avatarEmoji(profile.avatar) : '🙂'}</Text>
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {pack.language.nameNative}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1} testID="home-pack">
            {format(s.learning, { language: languageName })}
          </Text>
        </View>
        <IconButton
          icon="🔊"
          label={c.play}
          onPress={() => audio.playPrompt('home')}
          testID="home-speaker"
        />
      </View>

      <FlatList
        data={modules}
        keyExtractor={m => m.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={renderTile}
      />

      {/* Grown-ups only: small, out of the way in the corner, and behind the parent gate. */}
      <View style={styles.parentsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.parents}
          testID="home-parents"
          onPress={() => navigation.navigate('ParentGate', { next: 'ParentArea' })}
          style={styles.parents}
        >
          <Text style={styles.parentsIcon}>🔒</Text>
          <Text style={styles.parentsLabel}>{c.parents}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 40 },
  titleBox: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.bengaliBold, fontSize: fontSize.xl, color: colors.text },
  subtitle: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  grid: { gap: spacing.md, paddingBottom: spacing.md },
  row: { gap: spacing.md },
  tile: {
    flex: 1,
    minHeight: 140,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  tileIcon: { fontSize: 56 },
  tileLabel: {
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.lg,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  parentsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  parents: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    opacity: 0.7,
  },
  parentsIcon: { fontSize: 18 },
  parentsLabel: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
});
