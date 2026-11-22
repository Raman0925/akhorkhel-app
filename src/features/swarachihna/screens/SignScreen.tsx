import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { audio, hasPackAudio } from '@/audio';
import { common, format, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fontForScript, fonts, MIN_TOUCH, radius, spacing } from '@/theme';
import { BigButton, Header, IconButton, Screen, usePack } from '@/ui';

import { signAlone } from '../logic/signAlone';
import { strings } from '../strings';

const STEP_MS = 400;
const PARTS = 5; // base, +, sign, =, result

export function SignScreen({ navigation, route }: ScreenProps<'Sign'>) {
  const pack = usePack();
  const c = useStrings(common);
  const s = useStrings(strings);
  const sign = pack.signs.find(sg => sg.id === route.params.signId);
  const [parts] = useState(() => Array.from({ length: PARTS }, () => new Animated.Value(0)));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    if (sign) {
      audio.playPack(pack.id, sign.audio);
    }
  }, [pack.id, sign]);

  // ক + া = কা appears piece by piece (native driver), then the syllable is spoken.
  const show = useCallback(() => {
    parts.forEach(v => v.setValue(0));
    Animated.stagger(
      STEP_MS,
      parts.map(v => Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true })),
    ).start();
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(play, STEP_MS * PARTS);
  }, [parts, play]);

  useEffect(() => {
    if (!sign) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return;
    }
    show();
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [sign, show, navigation]);

  if (!sign) {
    return <Screen testID="screen-Sign">{null}</Screen>;
  }

  const font = fontForScript(pack.script, true);
  const piece = (i: number, text: string, style: object, testID?: string) => {
    const v = parts[i] as Animated.Value;
    const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
    return (
      <Animated.Text
        style={[style, { opacity: v, transform: [{ scale }] }]}
        testID={testID}
        accessible={false}
      >
        {text}
      </Animated.Text>
    );
  };

  return (
    <Screen testID="screen-Sign">
      <Header
        title={c.signs}
        right={
          // No recording yet (ADR 0004): no speaker button.
          hasPackAudio(pack.id, sign.audio) ? (
            <IconButton icon="🔊" label={s.listen} onPress={play} testID="sign-listen" />
          ) : undefined
        }
      />
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${s.showAgain}: ${format(s.sum, {
            base: sign.base,
            sign: signAlone(sign.sign),
            result: sign.result,
          })}`}
          onPress={show}
          style={styles.sum}
          testID="sign-sum"
        >
          {piece(0, sign.base, [styles.part, { fontFamily: font }], 'sign-base')}
          {piece(1, '+', styles.op)}
          {piece(2, signAlone(sign.sign), [styles.part, { fontFamily: font }], 'sign-sign')}
          {piece(3, '=', styles.op)}
          {piece(4, sign.result, [styles.result, { fontFamily: font }], 'sign-result')}
        </Pressable>
        <BigButton
          icon="✍️"
          label={s.trace}
          onPress={() => navigation.navigate('Trace', { itemKey: sign.key })}
          style={styles.trace}
          testID="sign-trace"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'space-around' },
  sum: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH * 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
  },
  part: { fontSize: 64, color: colors.text },
  op: { fontFamily: fonts.latinBold, fontSize: 40, color: colors.textMuted },
  result: { fontSize: 80, color: colors.primary },
  trace: { minHeight: 96 },
});
