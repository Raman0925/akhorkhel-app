/**
 * The tracing surface (handover 5.2).
 *
 * Drawing: faint glyph outline, a dashed guide per stroke, start dot, stroke numbers and an animated
 * direction arrow (level 1); level 2 fades the guide; level 3 shows only an empty box.
 *
 * Performance: touch points go straight into a shared value on the UI thread and the ink path is
 * rebuilt there with `usePathValue`. React state changes only when a stroke ends (scored on JS).
 */
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Path,
  RoundedRect,
  usePathValue,
  type SkPath,
  type SkPathBuilder,
} from '@shopify/react-native-skia';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Traceable } from '@/content';
import { colors, fonts, radius } from '@/theme';

import { clamp01, levelConfig, snapPoint, type GlyphScore, type Level, type Vec } from '../scorer';
import { referenceStrokes, startSession, submitStroke, type Feedback } from '../session';
import { arrowHeadPath, outlinePath, resampledFlat, strokePath } from './paths';

export type TraceCanvasHandle = {
  /** "Watch how it is written": animate every stroke in order. */
  playDemo: () => void;
  /** Wipe the ink and start this trace again. */
  clear: () => void;
};

type Props = {
  item: Traceable;
  level: Level;
  /** Side of the square canvas in dp. */
  size: number;
  /** Left-hand mode: stroke numbers sit on the right of the start dot so the hand doesn't hide them. */
  leftHanded?: boolean;
  /** Called after every finished stroke (screen plays voice prompts / sounds). */
  onFeedback?: (feedback: Feedback) => void;
  /** Called once when the trace is finished. */
  onComplete: (result: GlyphScore) => void;
  /** Called when a demo animation (whole glyph or one stroke) has finished. */
  onDemoEnd?: () => void;
  ref?: React.Ref<TraceCanvasHandle>;
  testID?: string;
};

const DEMO_MS_PER_STROKE = 900;
/** Touch points closer than this (px) to the previous one are skipped: less work per frame. */
const MIN_STEP_PX = 2;
const DEMO_N = 32;

/** Builds one polyline per flat array; runs on the UI thread. */
function addPolylines(b: SkPathBuilder, lines: readonly (readonly number[])[]) {
  'worklet';
  for (const a of lines) {
    if (a.length < 2) {
      continue;
    }
    b.moveTo(a[0] as number, a[1] as number);
    if (a.length === 2) {
      b.lineTo((a[0] as number) + 0.5, a[1] as number);
    }
    for (let i = 2; i + 1 < a.length; i += 2) {
      b.lineTo(a[i] as number, a[i + 1] as number);
    }
  }
}

export function TraceCanvas({
  item,
  level,
  size,
  leftHanded = false,
  onFeedback,
  onComplete,
  onDemoEnd,
  ref,
  testID = 'trace-canvas',
}: Props) {
  const refs = useMemo(() => referenceStrokes(item.strokes), [item.strokes]);
  const count = refs.length;
  const cfg = levelConfig(level);
  const outline = useMemo(() => outlinePath(item.outline), [item.outline]);
  const guidePaths = useMemo(() => refs.map(r => strokePath(r, size)), [refs, size]);
  const demoFlat = useMemo(() => refs.map(r => resampledFlat(r, size, DEMO_N)), [refs, size]);
  const arrowHead = useMemo(() => arrowHeadPath(size * 0.045), [size]);

  const [session, setSession] = useState(() => startSession(level));
  const sessionRef = useRef(session);
  const [finished, setFinished] = useState(false);

  // ---- UI-thread state -------------------------------------------------------------------------
  const live = useSharedValue<number[]>([]);
  const liveOpacity = useSharedValue(1);
  const done = useSharedValue<number[][]>([]);
  const doneOpacity = useSharedValue(1);
  const snapLine = useSharedValue<number[]>([]);
  const arrowLine = useSharedValue<number[]>([]);
  const arrowT = useSharedValue(0);
  const demoProgress = useSharedValue(0);
  const demoFrom = useSharedValue(0);
  const demoOpacity = useSharedValue(0);

  const current = session.strokeIndex;
  const guided = level !== 3;

  useEffect(() => {
    const line = demoFlat[current] ?? [];
    snapLine.value = cfg.snapStrength > 0 ? line : [];
    arrowLine.value = level === 1 ? line : [];
  }, [current, demoFlat, cfg.snapStrength, level, snapLine, arrowLine]);

  useEffect(() => {
    if (level !== 1) {
      return;
    }
    arrowT.value = 0;
    arrowT.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
    return () => cancelAnimation(arrowT);
  }, [level, arrowT]);

  const livePath = usePathValue(b => {
    'worklet';
    addPolylines(b, [live.value]);
  });
  const donePath = usePathValue(b => {
    'worklet';
    addPolylines(b, done.value);
  });

  const arrowTransform = useDerivedValue(() => {
    const a = arrowLine.value;
    const m = a.length / 2;
    if (m < 2) {
      return [{ translateX: -9999 }, { translateY: -9999 }, { rotate: 0 }];
    }
    const f = arrowT.value * (m - 1);
    const k = Math.min(m - 2, Math.floor(f));
    const t = f - k;
    const x0 = a[2 * k] as number;
    const y0 = a[2 * k + 1] as number;
    const x1 = a[2 * k + 2] as number;
    const y1 = a[2 * k + 3] as number;
    return [
      { translateX: x0 + (x1 - x0) * t },
      { translateY: y0 + (y1 - y0) * t },
      { rotate: Math.atan2(y1 - y0, x1 - x0) },
    ];
  });
  const arrowOpacity = useDerivedValue(() =>
    live.value.length > 0 || demoOpacity.value > 0 ? 0 : 0.9,
  );

  const demoPen = useDerivedValue(() => {
    const n = demoFlat.length;
    if (n === 0) {
      return { x: -9999, y: -9999 };
    }
    const p = demoProgress.value;
    const s = Math.max(0, Math.min(n - 1, Math.floor(p)));
    const t = Math.max(0, Math.min(1, p - s));
    const arr = demoFlat[s] as number[];
    const k = Math.round(t * (DEMO_N - 1));
    return { x: arr[2 * k] as number, y: arr[2 * k + 1] as number };
  });

  // ---- Demo animation --------------------------------------------------------------------------
  const playStrokes = useCallback(
    (from: number, to: number) => {
      if (count === 0 || to <= from) {
        return;
      }
      cancelAnimation(demoProgress);
      demoFrom.value = from;
      demoProgress.value = from;
      demoOpacity.value = 1;
      demoProgress.value = withTiming(to, { duration: (to - from) * DEMO_MS_PER_STROKE }, ok => {
        'worklet';
        if (ok) {
          demoOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
          if (onDemoEnd) {
            scheduleOnRN(onDemoEnd);
          }
        }
      });
    },
    [count, demoFrom, demoOpacity, demoProgress, onDemoEnd],
  );

  const fadeLive = useCallback(() => {
    liveOpacity.value = withTiming(0, { duration: 350 }, ok => {
      'worklet';
      if (ok) {
        live.value = [];
        liveOpacity.value = 1;
      }
    });
  }, [live, liveOpacity]);

  const reset = useCallback(() => {
    const fresh = startSession(level);
    sessionRef.current = fresh;
    setSession(fresh);
    setFinished(false);
    live.value = [];
    done.value = [];
    doneOpacity.value = 1;
    liveOpacity.value = 1;
  }, [level, live, done, doneOpacity, liveOpacity]);

  useImperativeHandle(ref, () => ({ playDemo: () => playStrokes(0, count), clear: reset }), [
    playStrokes,
    count,
    reset,
  ]);

  // ---- Stroke end (JS thread) ------------------------------------------------------------------
  const handleStrokeEnd = useCallback(
    (flat: number[]) => {
      const pts: Vec[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        pts.push([clamp01((flat[i] as number) / size), clamp01((flat[i + 1] as number) / size)]);
      }
      const { state, feedback } = submitStroke(sessionRef.current, pts, refs);
      sessionRef.current = state;
      setSession(state);
      switch (feedback.kind) {
        case 'ignored':
          live.value = [];
          break;
        case 'good':
        case 'complete':
          // Both writes reach the UI thread together, so the ink never flickers.
          done.value = [...done.value, flat];
          live.value = [];
          break;
        case 'weak':
          fadeLive();
          playStrokes(feedback.replayStroke, feedback.replayStroke + 1);
          break;
        case 'weakGlyph':
          fadeLive();
          doneOpacity.value = withTiming(0, { duration: 350 }, ok => {
            'worklet';
            if (ok) {
              done.value = [];
              doneOpacity.value = 1;
            }
          });
          playStrokes(0, count);
          break;
      }
      onFeedback?.(feedback);
      if (feedback.kind === 'complete') {
        setFinished(true);
        onComplete(feedback.result);
      }
    },
    [size, refs, count, live, done, doneOpacity, fadeLive, playStrokes, onFeedback, onComplete],
  );

  // ---- Gesture (UI thread) ---------------------------------------------------------------------
  const snapStrength = cfg.snapStrength;
  const snapRadius = cfg.snapRadius * size;
  const pan = usePanGesture({
    testID: 'trace-pan',
    minDistance: 0,
    maxPointers: 1,
    enabled: !finished && count > 0,
    onBegin: e => {
      'worklet';
      demoOpacity.value = 0;
      cancelAnimation(liveOpacity);
      liveOpacity.value = 1;
      const p = snapPoint(e.x, e.y, snapLine.value, snapStrength, snapRadius);
      live.value = [p[0], p[1]];
    },
    onUpdate: e => {
      'worklet';
      const a = live.value;
      const n = a.length;
      if (n < 2) {
        return;
      }
      const p = snapPoint(e.x, e.y, snapLine.value, snapStrength, snapRadius);
      const dx = p[0] - (a[n - 2] as number);
      const dy = p[1] - (a[n - 1] as number);
      if (dx * dx + dy * dy < MIN_STEP_PX * MIN_STEP_PX) {
        return;
      }
      live.modify(arr => {
        'worklet';
        arr.push(p[0], p[1]);
        return arr;
      });
    },
    onFinalize: () => {
      'worklet';
      const a = live.value;
      if (a.length > 0) {
        scheduleOnRN(handleStrokeEnd, a.slice());
      }
    },
  });

  // ---- Render ----------------------------------------------------------------------------------
  const inkWidth = Math.max(10, size * 0.055);
  const guideWidth = Math.max(2, size * 0.012);
  const dash = Math.max(6, size * 0.03);
  const outlineOpacity = level === 1 ? 0.35 : level === 2 ? 0.15 : 0;
  const guideOpacity = level === 1 ? 1 : 0.5;
  const start = guided ? refs[current]?.[0] : undefined;
  const inkColor = finished || guided ? colors.inkGood : colors.ink;
  const numberSize = Math.round(Math.min(28, Math.max(16, size * 0.06)));

  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      testID={testID}
      accessibilityLabel={item.display}
    >
      <GestureDetector gesture={pan}>
        <Canvas style={{ width: size, height: size }}>
          <RoundedRect
            x={1}
            y={1}
            width={size - 2}
            height={size - 2}
            r={radius.lg}
            color={colors.border}
            style="stroke"
            strokeWidth={2}
          />
          {outline && outlineOpacity > 0 ? (
            <Group transform={[{ scale: size }]} opacity={outlineOpacity}>
              <Path path={outline} color={colors.guide} />
            </Group>
          ) : null}
          {guided
            ? guidePaths.map((p, i) =>
                i < current || (level === 2 && i !== current) ? null : (
                  <Path
                    key={`g${i}`}
                    path={p}
                    style="stroke"
                    strokeWidth={i === current ? guideWidth * 1.4 : guideWidth}
                    strokeCap="round"
                    color={i === current ? colors.textMuted : colors.guide}
                    opacity={guideOpacity}
                  >
                    <DashPathEffect intervals={[dash, dash * 0.8]} />
                  </Path>
                ),
              )
            : null}
          {start ? (
            <Circle
              cx={start[0] * size}
              cy={start[1] * size}
              r={Math.max(10, size * 0.035)}
              color={colors.startDot}
            />
          ) : null}
          {level === 1 ? (
            <Group transform={arrowTransform} opacity={arrowOpacity}>
              <Path path={arrowHead} color={colors.arrow} />
            </Group>
          ) : null}
          <Group opacity={demoOpacity}>
            {guidePaths.map((p, i) => (
              <DemoStroke
                key={`d${i}`}
                path={p}
                index={i}
                progress={demoProgress}
                from={demoFrom}
                width={inkWidth * 0.8}
              />
            ))}
            <Circle c={demoPen} r={inkWidth * 0.6} color={colors.arrow} />
          </Group>
          <Path
            path={donePath}
            style="stroke"
            strokeWidth={inkWidth}
            strokeCap="round"
            strokeJoin="round"
            color={inkColor}
            opacity={doneOpacity}
          />
          <Path
            path={livePath}
            style="stroke"
            strokeWidth={inkWidth}
            strokeCap="round"
            strokeJoin="round"
            color={colors.ink}
            opacity={liveOpacity}
          />
        </Canvas>
      </GestureDetector>
      {guided
        ? refs.map((r, i) => {
            const p = r[0];
            if (!p || i < current || (level === 2 && i !== current)) {
              return null;
            }
            const off = size * 0.07;
            return (
              <Text
                key={`n${i}`}
                style={[
                  styles.number,
                  i !== current && styles.numberFaded,
                  {
                    fontSize: numberSize,
                    left: p[0] * size + (leftHanded ? off * 0.4 : -off * 1.4),
                    top: p[1] * size - off * 1.2,
                  },
                ]}
              >
                {i + 1}
              </Text>
            );
          })
        : null}
    </View>
  );
}

function DemoStroke({
  path,
  index,
  progress,
  from,
  width,
}: {
  path: SkPath;
  index: number;
  progress: SharedValue<number>;
  from: SharedValue<number>;
  width: number;
}) {
  const end = useDerivedValue(() => {
    const v = index < from.value ? 0 : progress.value - index;
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
      color={colors.arrow}
      opacity={0.7}
    />
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  number: {
    position: 'absolute',
    fontFamily: fonts.latinBold,
    color: colors.primaryDark,
    minWidth: 24,
    textAlign: 'center',
    pointerEvents: 'none',
  },
  numberFaded: { opacity: 0.5 },
});
