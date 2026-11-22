import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { audio } from '@/audio';
import type { Word } from '@/content';
import { common, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fontForScript, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';
import { Header, Screen, usePack } from '@/ui';

import { WordPicture } from '@/ui';

const COLUMNS = 3;

export function WordListScreen({ navigation }: ScreenProps<'WordList'>) {
  const pack = usePack();
  const c = useStrings(common);
  const { width } = useWindowDimensions();
  const tile = Math.max(MIN_TOUCH, (width - spacing.md * 2 - spacing.sm * (COLUMNS - 1)) / COLUMNS);
  const font = fontForScript(pack.script);

  const renderItem = ({ item }: { item: Word }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.text}
      testID={`word-tile-${item.id}`}
      onPress={() => {
        audio.sfx('tap');
        navigation.navigate('Word', { wordId: item.id });
      }}
      style={({ pressed }) => [
        styles.tile,
        { width: tile, height: tile },
        pressed && styles.pressed,
      ]}
    >
      <WordPicture packId={pack.id} word={item} size={tile * 0.55} />
      <Text style={[styles.text, { fontFamily: font }]} numberOfLines={1} adjustsFontSizeToFit>
        {item.text}
      </Text>
    </Pressable>
  );

  return (
    <Screen prompt="words" banner testID="screen-WordList">
      <Header title={c.words} prompt="words" />
      <FlatList
        data={pack.words}
        keyExtractor={w => w.id}
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
    padding: spacing.xs,
  },
  text: { fontSize: fontSize.md, color: colors.text },
  pressed: { transform: [{ scale: 0.95 }] },
});
