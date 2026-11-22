/** Dev-only drawing surface for the Stroke Recorder: outline large, strokes drawn one by one. */
import {
  Canvas,
  Circle,
  Group,
  Path,
  RoundedRect,
  usePathValue,
  type SkPath,
} from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, fonts, radius } from '@/theme';

import { outlinePath, strokePath } from '../canvas/paths';

type Props = {
  size: number;
  outline: string;
  /** Recorded strokes, unit box. */
  strokes: readonly (readonly [number, number][])[];
  onStroke: (flat: number[]) => void;
  /** Change to replay the stroke-order preview. */
  previewToken: number;
};

const PREVIEW_MS_PER_STROKE = 700;

export function RecorderCanvas({ size, outline, strokes, onStroke, previewToken }: Props) {
  const outlineSk = useMemo(() => outlinePath(outline), [outline]);
  const paths = useMemo(() => strokes.map(s => strokePath(s, size)), [strokes, size]);
  const live = useSharedValue<number[]>([]);
  const progress = useSharedValue(Number.MAX_SAFE_INTEGER);

  useEffect(() => {
    if (previewToken > 0 && strokes.length > 0) {
      progress.value = 0;
      progress.value = withTiming(strokes.length, {
        duration: strokes.length * PREVIEW_MS_PER_STROKE,
      });
    }
    // Only a new token starts a preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewToken]);

  const livePath = usePathValue(b => {
    'worklet';
    const a = live.value;
    if (a.length < 2) {
      return;
    }
    b.moveTo(a[0] as number, a[1] as number);
    for (let i = 2; i + 1 < a.length; i += 2) {
      b.lineTo(a[i] as number, a[i + 1] as number);
    }
  });

  const pan = usePanGesture({
    testID: 'recorder-pan',
    minDistance: 0,
    maxPointers: 1,
    onBegin: e => {
      'worklet';
      live.value = [e.x, e.y];
    },
    onUpdate: e => {
      'worklet';
      live.modify(arr => {
        'worklet';
        arr.push(e.x, e.y);
        return arr;
      });
    },
    onFinalize: () => {
      'worklet';
      const a = live.value.slice();
      live.value = [];
      if (a.length > 0) {
        scheduleOnRN(onStroke, a);
      }
    },
  });

  const inkWidth = Math.max(6, size * 0.03);
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <GestureDetector gesture={pan}>
        <Canvas style={{ width: size, height: size }}>
          <RoundedRect
            x={1}
            y={1}
            width={size - 2}
            height={size - 2}
            r={radius.md}
            color={colors.border}
            style="stroke"
            strokeWidth={2}
          />
          {outlineSk ? (
            <Group transform={[{ scale: size }]} opacity={0.35}>
              <Path path={outlineSk} color={colors.guide} />
            </Group>
          ) : null}
          {paths.map((p, i) => (
            <RecordedStroke key={i} path={p} index={i} progress={progress} width={inkWidth} />
          ))}
          {strokes.map((s, i) =>
            s[0] ? (
              <Circle
                key={`s${i}`}
                cx={s[0][0] * size}
                cy={s[0][1] * size}
                r={inkWidth * 0.9}
                color={colors.startDot}
              />
            ) : null,
          )}
          <Path
            path={livePath}
            style="stroke"
            strokeWidth={inkWidth}
            strokeCap="round"
            strokeJoin="round"
            color={colors.ink}
          />
        </Canvas>
      </GestureDetector>
      {strokes.map((s, i) =>
        s[0] ? (
          <Text
            key={`n${i}`}
            style={[
              styles.number,
              { left: s[0][0] * size + inkWidth, top: s[0][1] * size - inkWidth * 3 },
            ]}
          >
            {i + 1}
          </Text>
        ) : null,
      )}
    </View>
  );
}

function RecordedStroke({
  path,
  index,
  progress,
  width,
}: {
  path: SkPath;
  index: number;
  progress: SharedValue<number>;
  width: number;
}) {
  const end = useDerivedValue(() => {
    const v = progress.value - index;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  });
  return (
    <Path
      path={path}
      start={0}
      end={end}
      style="stroke"
      strokeWidth={width}
      strokeCap="round"
      strokeJoin="round"
      color={colors.inkGood}
    />
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  number: {
    position: 'absolute',
    fontFamily: fonts.latinBold,
    fontSize: 18,
    color: colors.primaryDark,
    pointerEvents: 'none',
  },
});
