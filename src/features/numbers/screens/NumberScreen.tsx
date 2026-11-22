import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audio } from '@/audio';
import { common, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fontForScript, fontSize, spacing } from '@/theme';
import { BigButton, Header, IconButton, Screen, usePack } from '@/ui';

import { MAX_COUNT } from '../logic/count';
import { strings } from '../strings';

export function NumberScreen({ navigation, route }: ScreenProps<'Number'>) {
  const pack = usePack();
  const c = useStrings(common);
  const s = useStrings(strings);
  const item = pack.numbers.find(n => n.value === route.params.value);

  // The number's own sound is this screen's voice.
  useEffect(() => {
    if (item) {
      audio.playPack(pack.id, item.audio);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
    return () => audio.stop();
  }, [pack.id, item, navigation]);

  if (!item) {
    return <Screen testID="screen-Number">{null}</Screen>;
  }

  const play = () => audio.playPack(pack.id, item.audio);
  const canCount = item.value >= 1 && item.value <= MAX_COUNT;

  return (
    <Screen testID="screen-Number">
      <Header
        title={c.numbers}
        right={<IconButton icon="🔊" label={s.listen} onPress={play} testID="number-listen" />}
      />
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${s.listen} ${item.numeral}`}
          onPress={play}
          style={styles.center}
          testID="number-numeral"
        >
          <Text
            style={[styles.numeral, { fontFamily: fontForScript(pack.script, true) }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {item.numeral}
          </Text>
          {item.word ? (
            <Text style={[styles.word, { fontFamily: fontForScript(pack.script) }]}>
              {item.word}
            </Text>
          ) : null}
        </Pressable>
        <View style={styles.actions}>
          <BigButton
            icon="✍️"
            label={s.trace}
            onPress={() => navigation.navigate('Trace', { itemKey: item.key })}
            style={styles.main}
            testID="number-trace"
          />
          {canCount ? (
            <BigButton
              icon="🖐️"
              label={s.count}
              variant="secondary"
              onPress={() => navigation.navigate('Count', { value: item.value })}
              testID="number-count"
            />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'space-around' },
  center: { alignItems: 'center' },
  numeral: { fontSize: 160, color: colors.text, textAlign: 'center' },
  word: { fontSize: fontSize.xl, color: colors.textMuted },
  actions: { gap: spacing.md },
  main: { minHeight: 96 },
});
