import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { audio } from '@/audio';
import { packAsset, type Letter } from '@/content';
import { common, useStrings } from '@/i18n';
import { useAds } from '@/monetization';
import type { ScreenProps } from '@/navigation';
import { bestStars, useCurrentProfile, usePackProgress } from '@/progress';
import { useSettings } from '@/storage/settings';
import { colors, fontForScript, fonts, MIN_TOUCH, radius, spacing } from '@/theme';
import { Header, Screen, StarRow, usePack } from '@/ui';

import { Celebration } from '../components/Celebration';
import { setsDone, takeBaseline, tracedSince, type Baseline } from '../logic/sets';
import { strings } from '../strings';

const COLUMNS = 4;
/** Quiet time on the grid between the celebration and any interstitial. */
const AD_DELAY_MS = 1000;

type Row =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'tiles'; key: string; letters: Letter[] };

function buildRows(letters: Letter[], titles: Record<Letter['group'], string>): Row[] {
  const rows: Row[] = [];
  (['vowel', 'consonant', 'other'] as const).forEach(group => {
    const items = letters.filter(l => l.group === group);
    if (items.length === 0) {
      return;
    }
    rows.push({ kind: 'header', key: `h-${group}`, title: titles[group] });
    for (let i = 0; i < items.length; i += COLUMNS) {
      rows.push({ kind: 'tiles', key: `${group}-${i}`, letters: items.slice(i, i + COLUMNS) });
    }
  });
  return rows;
}

export function LetterGridScreen({ navigation }: ScreenProps<'LetterGrid'>) {
  const pack = usePack();
  const c = useStrings(common);
  const s = useStrings(strings);
  const profile = useCurrentProfile();
  const progress = usePackProgress(profile?.id ?? null, pack.id);
  const incrementSessions = useSettings(st => st.incrementSessions);
  const ads = useAds();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();

  const keys = useMemo(() => pack.letters.map(l => l.key), [pack.letters]);
  const rows = useMemo(
    () => buildRows(pack.letters, { vowel: s.vowels, consonant: s.consonants, other: s.other }),
    [pack.letters, s],
  );

  // The grid session starts when the grid opens; traces recorded after that count towards a set.
  const [baseline] = useState<Baseline>(() => takeBaseline(progress, keys));
  const celebrated = useRef(0);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    audio.preload(pack.letters.map(l => packAsset(pack.id, l.audio)));
  }, [pack]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    const sets = setsDone(tracedSince(baseline, progress, keys));
    if (sets > celebrated.current) {
      celebrated.current = sets;
      incrementSessions();
      setCelebrating(true);
    }
  }, [isFocused, baseline, progress, keys, incrementSessions]);

  const adTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (adTimer.current) {
        clearTimeout(adTimer.current);
      }
    },
    [],
  );

  const onCelebrationDone = useCallback(
    (byTap: boolean) => {
      setCelebrating(false);
      // A tap must never lead into an ad: if the child tapped the celebration away, skip the
      // interstitial for this set. Otherwise wait a moment on the plain grid first.
      if (byTap) {
        return;
      }
      adTimer.current = setTimeout(() => {
        adTimer.current = null;
        if (navigation.isFocused()) {
          // The ads module enforces every cap; lessons never wait on it.
          ads.onSetComplete().catch(() => undefined);
        }
      }, AD_DELAY_MS);
    },
    [ads, navigation],
  );

  const font = fontForScript(pack.script, true);
  const tileSize = Math.max(MIN_TOUCH, (width - spacing.md * 2 - spacing.sm * COLUMNS) / COLUMNS);

  return (
    <Screen prompt="letterGrid" banner testID="screen-LetterGrid">
      <Header title={c.letters} prompt="letterGrid" />
      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text style={styles.section} accessibilityRole="header">
              {item.title}
            </Text>
          ) : (
            <View style={styles.row}>
              {item.letters.map(l => (
                <Pressable
                  key={l.id}
                  accessibilityRole="button"
                  accessibilityLabel={l.glyph}
                  testID={`letter-tile-${l.id}`}
                  onPress={() => {
                    audio.sfx('tap');
                    navigation.navigate('Letter', { letterId: l.id });
                  }}
                  style={({ pressed }) => [
                    styles.tile,
                    { width: tileSize, height: tileSize + 16 },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.glyph, { fontFamily: font, fontSize: tileSize * 0.45 }]}>
                    {l.glyph}
                  </Text>
                  <StarRow stars={bestStars(progress[l.key])} size={14} />
                </Pressable>
              ))}
            </View>
          )
        }
      />
      {celebrating ? (
        <Celebration message={s.setDone} prompt="setComplete" onDone={onCelebrationDone} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fonts.bengaliBold,
    fontSize: 22,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.95 }] },
  glyph: { color: colors.text },
});
