import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audio, hasPackAudio } from '@/audio';
import { common, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fontForScript, fonts, fontSize, radius, spacing } from '@/theme';
import { Header, IconButton, Screen, usePack } from '@/ui';

import { WordPicture } from '@/ui';
import { strings } from '../strings';

export function WordScreen({ navigation, route }: ScreenProps<'Word'>) {
  const pack = usePack();
  const c = useStrings(common);
  const s = useStrings(strings);
  const word = pack.words.find(w => w.id === route.params.wordId);

  // The word itself is this screen's voice.
  useEffect(() => {
    if (word) {
      audio.playPack(pack.id, word.audio);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
    return () => audio.stop();
  }, [pack.id, word, navigation]);

  if (!word) {
    return <Screen testID="screen-Word">{null}</Screen>;
  }

  const play = () => audio.playPack(pack.id, word.audio);
  // No recording yet (ADR 0004): no speaker button and no "listen" in the label.
  const audible = hasPackAudio(pack.id, word.audio);
  const bridge = word.bridge && (word.bridge.as || word.bridge.en) ? word.bridge : undefined;

  return (
    <Screen testID="screen-Word">
      <Header
        title={c.words}
        right={
          audible ? (
            <IconButton icon="🔊" label={s.listen} onPress={play} testID="word-listen" />
          ) : undefined
        }
      />
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={audible ? `${s.listen} ${word.text}` : word.text}
          onPress={play}
          style={styles.picture}
          testID="word-picture"
        >
          <WordPicture packId={pack.id} word={word} size={200} />
          <Text style={[styles.text, { fontFamily: fontForScript(pack.script, true) }]}>
            {word.text}
          </Text>
        </Pressable>

        {bridge ? (
          <View style={styles.bridge} testID="word-bridge">
            <Text style={[styles.bridgeMain, { fontFamily: fontForScript(pack.script, true) }]}>
              {word.text}
            </Text>
            {bridge.as ? (
              <View style={styles.bridgeRow}>
                <Text style={styles.bridgeLabel}>{s.assamese}</Text>
                <Text style={[styles.bridgeText, { fontFamily: fontForScript('Beng') }]}>
                  {bridge.as}
                </Text>
              </View>
            ) : null}
            {bridge.en ? (
              <View style={styles.bridgeRow}>
                <Text style={styles.bridgeLabel}>{s.english}</Text>
                <Text style={[styles.bridgeText, { fontFamily: fontForScript('Latn') }]}>
                  {bridge.en}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-around' },
  picture: { alignItems: 'center', gap: spacing.md, padding: spacing.md },
  text: { fontSize: fontSize.xl * 1.5, color: colors.text },
  bridge: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.sky,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bridgeMain: { fontSize: fontSize.lg, color: colors.text, textAlign: 'center' },
  bridgeRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  bridgeLabel: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    minWidth: 90,
  },
  bridgeText: { fontSize: fontSize.lg, color: colors.text },
});
