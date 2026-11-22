import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audio } from '@/audio';
import { format, useStrings } from '@/i18n';
import { useActiveStickers } from '@/monetization';
import type { ScreenProps } from '@/navigation';
import { colors, fontForScript, MIN_TOUCH, radius, spacing } from '@/theme';
import { BigButton, Header, Screen, usePack } from '@/ui';

import { Celebration } from '@/ui';
import { countObjects } from '../logic/count';
import { strings } from '../strings';

const OBJECT_SIZE = 72;

/** Tap each object to count it; the running number grows; at the end hear the number. */
export function CountScreen({ route }: ScreenProps<'Count'>) {
  const pack = usePack();
  const s = useStrings(strings);
  const stickers = useActiveStickers();
  const { value } = route.params;
  const objects = useMemo(() => countObjects(value, stickers, value), [value, stickers]);
  const [counted, setCounted] = useState<number[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const target = pack.numbers.find(n => n.value === value);
  const font = fontForScript(pack.script, true);
  const numeralFor = (n: number) => pack.numbers.find(x => x.value === n)?.numeral ?? String(n);
  const done = objects.length > 0 && counted.length === objects.length;

  const tap = (i: number) => {
    if (counted.includes(i)) {
      return;
    }
    audio.sfx('pop');
    const next = [...counted, i];
    setCounted(next);
    if (next.length === objects.length) {
      if (target) {
        audio.playPack(pack.id, target.audio);
      }
      setCelebrating(true);
    }
  };

  return (
    <Screen prompt="count" testID="screen-Count">
      <Header title={s.count} prompt="count" />
      <Text
        style={[styles.running, { fontFamily: font }]}
        accessibilityLiveRegion="polite"
        testID="count-running"
      >
        {counted.length > 0 ? numeralFor(counted.length) : ' '}
      </Text>
      <View style={styles.field}>
        {objects.map((emoji, i) => {
          const order = counted.indexOf(i);
          const isCounted = order >= 0;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={
                isCounted ? `${s.counted} ${order + 1}` : format(s.countItem, { n: i + 1 })
              }
              accessibilityState={{ disabled: isCounted }}
              onPress={() => tap(i)}
              style={[styles.object, isCounted && styles.counted]}
              testID={`count-object-${i}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              {isCounted ? (
                <Text style={[styles.badge, { fontFamily: font }]}>{numeralFor(order + 1)}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {done && !celebrating ? (
        <BigButton icon="🔁" label={s.again} onPress={() => setCounted([])} testID="count-again" />
      ) : null}
      {celebrating ? (
        <Celebration message={s.finished} onDone={() => setCelebrating(false)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  running: { fontSize: 72, color: colors.primary, textAlign: 'center', minHeight: 96 },
  field: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: spacing.sm,
  },
  object: {
    width: Math.max(OBJECT_SIZE, MIN_TOUCH),
    height: Math.max(OBJECT_SIZE, MIN_TOUCH),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counted: { backgroundColor: colors.surfaceAlt, borderColor: colors.accent },
  emoji: { fontSize: 40 },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    fontSize: 18,
    color: colors.onPrimary,
    backgroundColor: colors.secondary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
});
