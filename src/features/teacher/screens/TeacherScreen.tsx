import React, { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { format, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import {
  bestStars,
  useProfiles,
  useProgress,
  type ItemProgress,
  type Profile,
  type Stars,
} from '@/progress';
import { useSettings } from '@/storage';
import { colors, fonts, fontForScript, fontSize, MIN_TOUCH, spacing } from '@/theme';
import { BigButton, Header, Screen, usePack } from '@/ui';

import { avatarEmoji } from '../avatars';
import { Tabs } from '../components/Tabs';
import { buildCsv, buildHtml, buildReport, sumStars, type Column } from '../report';
import { shareCsv, sharePdf } from '../share';
import { strings } from '../strings';
import { useTabs } from '../useTabs';

const NAME_W = 150;
const CELL_W = 40;
const TOTAL_W = 64;
const ROW_H = MIN_TOUCH;

const EMPTY: Record<string, ItemProgress> = {};

/**
 * Class progress grid: rows = children, columns = items of the current tab, cells = best stars.
 * Rows are virtualised (FlatList) and memoised, so 40 children × ~55 letters scroll smoothly.
 */
export function TeacherScreen({ navigation }: ScreenProps<'Teacher'>) {
  const s = useStrings(strings);
  const pack = usePack();
  const uiLanguage = useSettings(st => st.uiLanguage);
  const profiles = useProfiles(st => st.profiles);
  const progress = useProgress(st => st.progress);
  const { tabs, all, tab, setTab, columns } = useTabs(pack);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const width = NAME_W + columns.length * CELL_W + TOTAL_W;
  const font = fontForScript(pack.script, true);

  const onOpen = useCallback(
    (id: string) => navigation.navigate('TeacherChild', { profileId: id }),
    [navigation],
  );

  const runExport = async (kind: 'csv' | 'pdf') => {
    setBusy(true);
    setError(false);
    try {
      // Export covers every tab of the pack, not only the one on screen.
      const report = buildReport(
        all.map(t => ({ title: s[t.id], columns: t.columns })),
        profiles,
        id => progress[id]?.[pack.id],
      );
      const labels = { name: s.name, total: s.total };
      if (kind === 'csv') {
        await shareCsv(buildCsv(report, labels));
      } else {
        const language = uiLanguage === 'as' ? pack.language.nameAs : pack.language.nameEn;
        const date = new Date().toISOString().slice(0, 10);
        await sharePdf(
          buildHtml(report, {
            ...labels,
            title: s.reportTitle,
            subtitle: format(s.reportSubtitle, { language, date }),
            emptyText: s.noItems,
          }),
        );
      }
    } catch (e) {
      console.warn('[teacher] export failed', e);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={styles.nameHeader}>{s.name}</Text>
      {columns.map(c => (
        <Text key={c.key} style={[styles.colHeader, { fontFamily: font }]} numberOfLines={1}>
          {c.label}
        </Text>
      ))}
      <Text style={styles.totalHeader}>★</Text>
    </View>
  );

  return (
    <Screen testID="screen-Teacher" banner>
      <Header title={s.title} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {profiles.length === 0 ? (
        <Text style={styles.message}>{s.noChildren}</Text>
      ) : columns.length === 0 ? (
        <Text style={styles.message}>{s.noItems}</Text>
      ) : (
        <>
          <Text style={styles.hint}>{s.hint}</Text>
          <ScrollView horizontal style={styles.grid} contentContainerStyle={{ width }}>
            <FlatList
              testID="teacher-grid"
              data={profiles}
              keyExtractor={p => p.id}
              ListHeaderComponent={header}
              stickyHeaderIndices={[0]}
              getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
              initialNumToRender={12}
              windowSize={7}
              renderItem={({ item }) => (
                <ChildRow
                  profile={item}
                  items={progress[item.id]?.[pack.id] ?? EMPTY}
                  columns={columns}
                  onOpen={onOpen}
                />
              )}
            />
          </ScrollView>
        </>
      )}
      {error ? <Text style={styles.message}>{s.exportFailed}</Text> : null}
      <View style={styles.actions}>
        <BigButton
          label={s.shareCsv}
          icon="📊"
          variant="surface"
          disabled={busy || profiles.length === 0}
          onPress={() => runExport('csv')}
          testID="teacher-share-csv"
          style={styles.action}
        />
        <BigButton
          label={s.sharePdf}
          icon="📄"
          variant="surface"
          disabled={busy || profiles.length === 0}
          onPress={() => runExport('pdf')}
          testID="teacher-share-pdf"
          style={styles.action}
        />
      </View>
    </Screen>
  );
}

const ChildRow = memo(function ChildRowInner({
  profile,
  items,
  columns,
  onOpen,
}: {
  profile: Profile;
  items: Record<string, ItemProgress>;
  columns: Column[];
  onOpen: (id: string) => void;
}) {
  const stars = columns.map(c => bestStars(items[c.key]));
  return (
    <View style={styles.row}>
      <Pressable
        testID={`teacher-row-${profile.id}`}
        accessibilityRole="button"
        accessibilityLabel={profile.nickname}
        onPress={() => onOpen(profile.id)}
        style={({ pressed }) => [styles.nameCell, pressed && styles.pressed]}
      >
        <Text style={styles.avatar}>{avatarEmoji(profile.avatar)}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {profile.nickname}
        </Text>
      </Pressable>
      {stars.map((n, i) => (
        <Cell key={columns[i]?.key ?? i} stars={n} />
      ))}
      <Text style={styles.total}>{sumStars(stars)}</Text>
    </View>
  );
});

const Cell = memo(function CellInner({ stars }: { stars: Stars }) {
  return (
    <View style={[styles.cell, CELL_BG[stars]]}>
      <Text style={[styles.cellText, stars === 0 && styles.cellEmpty]}>{stars}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', height: ROW_H },
  headerRow: { backgroundColor: colors.background, height: 44 },
  nameHeader: {
    width: NAME_W,
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  colHeader: { width: CELL_W, textAlign: 'center', fontSize: fontSize.md, color: colors.text },
  totalHeader: { width: TOTAL_W, textAlign: 'center', fontSize: fontSize.md, color: colors.accent },
  nameCell: {
    width: NAME_W,
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  avatar: { fontSize: 28 },
  name: { flex: 1, fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.sky },
  cell: {
    width: CELL_W - 4,
    height: CELL_W - 4,
    margin: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontFamily: fonts.latinBold, fontSize: fontSize.sm, color: colors.text },
  cellEmpty: { color: colors.guide },
  total: {
    width: TOTAL_W,
    textAlign: 'center',
    fontFamily: fonts.latinBold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  message: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  hint: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
});

const CELL_BG = StyleSheet.create({
  0: { backgroundColor: colors.background },
  1: { backgroundColor: '#FFF1C7' },
  2: { backgroundColor: '#FFE08A' },
  3: { backgroundColor: colors.accent },
});
