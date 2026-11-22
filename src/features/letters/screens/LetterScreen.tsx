import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audio } from '@/audio';
import { common, format, useStrings } from '@/i18n';
import type { ScreenProps, TraceLevelParam } from '@/navigation';
import { useCurrentProfile, useItemProgress } from '@/progress';
import { colors, fontForScript, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';
import { BigButton, Header, IconButton, Screen, StarRow, usePack } from '@/ui';

import { WordPicture } from '../components/WordPicture';
import { strings } from '../strings';

const LEVELS: TraceLevelParam[] = [1, 2, 3];

export function LetterScreen({ navigation, route }: ScreenProps<'Letter'>) {
  const pack = usePack();
  const c = useStrings(common);
  const s = useStrings(strings);
  const profile = useCurrentProfile();
  const index = pack.letters.findIndex(l => l.id === route.params.letterId);
  const letter = pack.letters[index];
  const progress = useItemProgress(profile?.id ?? null, pack.id, letter?.key ?? '');
  const [picking, setPicking] = useState(false);

  // The letter's own sound is this screen's voice: play it when the letter appears.
  useEffect(() => {
    if (letter) {
      audio.playPack(pack.id, letter.audio);
    } else if (navigation.canGoBack()) {
      // Unknown id (e.g. the pack changed): nothing to show, so quietly go back.
      navigation.goBack();
    }
    return () => audio.stop();
  }, [pack.id, letter, navigation]);

  if (!letter) {
    return <Screen testID="screen-Letter">{null}</Screen>;
  }

  const example = letter.exampleWordId
    ? pack.words.find(w => w.id === letter.exampleWordId)
    : undefined;
  const prev = pack.letters[index - 1];
  const next = pack.letters[index + 1];
  const playLetter = () => audio.playPack(pack.id, letter.audio);
  const goTo = (letterId: string) => {
    setPicking(false);
    navigation.setParams({ letterId });
  };

  return (
    <Screen testID="screen-Letter">
      <Header
        title={c.letters}
        right={
          <IconButton icon="🔊" label={s.listen} onPress={playLetter} testID="letter-listen" />
        }
      />
      <View style={styles.body}>
        <View style={styles.glyphRow}>
          {prev ? (
            <IconButton
              icon="◀️"
              label={s.previous}
              onPress={() => goTo(prev.id)}
              testID="letter-prev"
            />
          ) : (
            <View style={styles.spacer} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${s.listen} ${letter.glyph}`}
            onPress={playLetter}
            style={styles.glyphBox}
            testID="letter-glyph"
          >
            <Text
              style={[styles.glyph, { fontFamily: fontForScript(pack.script, true) }]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {letter.glyph}
            </Text>
          </Pressable>
          {next ? (
            <IconButton
              icon="▶️"
              label={s.nextLetter}
              onPress={() => goTo(next.id)}
              testID="letter-next"
            />
          ) : (
            <View style={styles.spacer} />
          )}
        </View>

        {example ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={format(s.exampleWord, { word: example.text })}
            onPress={() => audio.playPack(pack.id, example.audio)}
            style={styles.wordCard}
            testID="letter-example"
          >
            <WordPicture packId={pack.id} word={example} size={88} />
            <Text style={[styles.wordText, { fontFamily: fontForScript(pack.script) }]}>
              {example.text}
            </Text>
          </Pressable>
        ) : null}

        {picking ? (
          <View style={styles.levels}>
            <Text style={styles.levelTitle}>{s.chooseLevel}</Text>
            <View style={styles.levelRow}>
              {LEVELS.map(level => (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityLabel={format(s.level, { n: level })}
                  testID={`trace-level-${level}`}
                  onPress={() => {
                    audio.sfx('tap');
                    setPicking(false);
                    navigation.navigate('Trace', { itemKey: letter.key, level });
                  }}
                  style={({ pressed }) => [styles.levelTile, pressed && styles.pressed]}
                >
                  <Text style={styles.levelNumber}>{level}</Text>
                  <StarRow stars={progress?.best[level - 1] ?? 0} size={16} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <BigButton
            icon="✍️"
            label={s.trace}
            onPress={() => setPicking(true)}
            testID="letter-trace"
            style={styles.traceButton}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-around' },
  glyphRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  glyphBox: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  glyph: { fontSize: 160, color: colors.text, textAlign: 'center' },
  spacer: { width: MIN_TOUCH, height: MIN_TOUCH },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  wordText: { fontSize: fontSize.xl, color: colors.text },
  traceButton: { alignSelf: 'stretch', minHeight: 96 },
  levels: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.sm },
  levelTitle: { fontFamily: fonts.bengaliBold, fontSize: fontSize.md, color: colors.text },
  levelRow: { flexDirection: 'row', gap: spacing.md },
  levelTile: {
    minWidth: 88,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  levelNumber: { fontFamily: fonts.latinBold, fontSize: fontSize.xl, color: colors.onPrimary },
  pressed: { transform: [{ scale: 0.95 }] },
});
