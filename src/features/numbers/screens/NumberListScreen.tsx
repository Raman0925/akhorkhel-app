import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { audio } from '@/audio';
import { packAsset, type NumberItem } from '@/content';
import { common, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { bestStars, useCurrentProfile, usePackProgress } from '@/progress';
import { colors, fontForScript, MIN_TOUCH, radius, spacing } from '@/theme';
import { Header, Screen, StarRow, usePack } from '@/ui';

const COLUMNS = 4;

export function NumberListScreen({ navigation }: ScreenProps<'NumberList'>) {
  const pack = usePack();
  const c = useStrings(common);
  const profile = useCurrentProfile();
  const progress = usePackProgress(profile?.id ?? null, pack.id);
  const { width } = useWindowDimensions();
  const tile = Math.max(MIN_TOUCH, (width - spacing.md * 2 - spacing.sm * (COLUMNS - 1)) / COLUMNS);
  const font = fontForScript(pack.script, true);

  useEffect(() => {
    audio.preload(pack.numbers.map(n => packAsset(pack.id, n.audio)));
  }, [pack]);

  const renderItem = ({ item }: { item: NumberItem }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.word ? `${item.numeral} ${item.word}` : item.numeral}
      testID={`number-tile-${item.value}`}
      onPress={() => {
        audio.sfx('tap');
        navigation.navigate('Number', { value: item.value });
      }}
      style={({ pressed }) => [
        styles.tile,
        { width: tile, height: tile + 16 },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.numeral, { fontFamily: font, fontSize: tile * 0.42 }]}>
        {item.numeral}
      </Text>
      <StarRow stars={bestStars(progress[item.key])} size={14} />
    </Pressable>
  );

  return (
    <Screen prompt="numbers" testID="screen-NumberList">
      <Header title={c.numbers} prompt="numbers" />
      <FlatList
        data={pack.numbers}
        keyExtractor={n => n.key}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { gap: spacing.sm },
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeral: { color: colors.text },
  pressed: { transform: [{ scale: 0.95 }] },
});
