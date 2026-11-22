import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { audio } from '@/audio';
import { format, useStrings } from '@/i18n';
import { useActiveStickers } from '@/monetization';
import type { ScreenProps } from '@/navigation';
import { useCurrentProfile, useProgress, type Stars, type TraceLevel } from '@/progress';
import { useSettings } from '@/storage/settings';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';
import { BigButton, Header, Screen, StarRow, usePack } from '@/ui';

import { TraceCanvas, type TraceCanvasHandle } from '../canvas/TraceCanvas';
import type { GlyphScore } from '../scorer';
import type { Feedback } from '../session';
import { strings } from '../strings';
import { findTraceable, isTraceReady, startLevel } from '../traceables';

/** Each visit the child traces the glyph this many times (handover 1.4). */
export const TRACES_PER_VISIT = 3;

export function TraceScreen({ route, navigation }: ScreenProps<'Trace'>) {
  const { itemKey } = route.params;
  const pack = usePack();
  const s = useStrings(strings);
  const profile = useCurrentProfile();
  const item = useMemo(() => findTraceable(pack, itemKey), [pack, itemKey]);

  if (!item || !isTraceReady(item)) {
    return (
      <Screen banner={false} testID="screen-Trace">
        <Header title={item?.display ?? s.title} />
        <View style={styles.center} testID="trace-not-ready">
          <Text style={styles.bigEmoji}>🦏</Text>
          <Text style={styles.message}>{s.notReadyTitle}</Text>
          <Text style={styles.subMessage}>{s.notReadyBody}</Text>
          <BigButton
            label={s.done}
            icon="🏠"
            onPress={() => navigation.goBack()}
            testID="trace-done"
          />
        </View>
      </Screen>
    );
  }

  return (
    <TraceSession
      key={item.key}
      item={item}
      packId={pack.id}
      profileId={profile?.id ?? null}
      initialLevel={route.params.level}
      onDone={() => navigation.goBack()}
    />
  );
}

type SessionProps = {
  item: NonNullable<ReturnType<typeof findTraceable>>;
  packId: string;
  profileId: string | null;
  initialLevel: TraceLevel | undefined;
  onDone: () => void;
};

function TraceSession({ item, packId, profileId, initialLevel, onDone }: SessionProps) {
  const s = useStrings(strings);
  const leftHanded = useSettings(st => st.leftHanded);
  const stickers = useActiveStickers();
  const { width, height } = useWindowDimensions();
  const canvasSize = Math.max(200, Math.min(width - spacing.md * 2, height * 0.55));

  const [level, setLevel] = useState<TraceLevel>(
    () =>
      initialLevel ??
      startLevel(
        profileId ? useProgress.getState().progress[profileId]?.[packId]?.[item.key] : undefined,
      ),
  );
  /** Finished traces this visit at the current level. */
  const [traces, setTraces] = useState<Stars[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [round, setRound] = useState(0);
  const canvas = useRef<TraceCanvasHandle>(null);
  /** "Start at the green dot" plays once, after the first demo of a level. */
  const introDone = useRef(false);

  const finishedVisit = traces.length >= TRACES_PER_VISIT;
  const lastStars = traces[traces.length - 1];
  const instruction = level === 3 ? 'traceMemory' : 'traceStart';

  // Levels 1–2 open with the "watch how it is written" demo.
  useEffect(() => {
    if (level === 3 || round > 0) {
      return;
    }
    const t = setTimeout(() => canvas.current?.playDemo(), 300);
    return () => clearTimeout(t);
  }, [level, round]);

  const onFeedback = useCallback((f: Feedback) => {
    switch (f.kind) {
      case 'good':
        audio.sfx('pop');
        break;
      case 'weak':
      case 'weakGlyph':
        audio.playPrompt('tryAgain');
        break;
      default:
        break;
    }
  }, []);

  const onDemoEnd = useCallback(() => {
    if (!introDone.current && level !== 3) {
      introDone.current = true;
      audio.playPrompt('traceStart');
    }
  }, [level]);

  const onComplete = useCallback(
    (result: GlyphScore) => {
      if (profileId) {
        useProgress.getState().record(profileId, packId, item.key, level, result.stars);
      }
      setTraces(prev => [...prev, result.stars]);
      setShowResult(true);
      audio.sfx('star');
      audio.playPrompt(result.stars === 3 ? 'great' : 'wellDone');
    },
    [profileId, packId, item.key, level],
  );

  useEffect(() => {
    if (finishedVisit) {
      audio.sfx('success');
    }
  }, [finishedVisit]);

  const traceAgain = () => {
    setShowResult(false);
    setRound(r => r + 1);
    audio.playPrompt('traceAgain');
  };

  const nextLevel = () => {
    const next = Math.min(3, level + 1) as TraceLevel;
    setLevel(next);
    setTraces([]);
    setShowResult(false);
    setRound(0);
    introDone.current = false;
    // Level 3 changes the screen prompt (Screen plays it); levels 1→2 keep "watch", so replay it.
    if (next !== 3) {
      audio.playPrompt('traceWatch');
    }
  };

  const replay = () => {
    audio.playPrompt('traceWatch');
    canvas.current?.playDemo();
  };

  const rowDirection = leftHanded ? styles.rowReverse : styles.row;

  return (
    <Screen
      banner={false}
      prompt={level === 3 ? 'traceMemory' : 'traceWatch'}
      testID="screen-Trace"
    >
      <Header title={item.display} prompt={instruction} />
      <View style={[styles.statusRow, rowDirection]}>
        <Text style={styles.levelText} testID="trace-level">
          {format(s.level, { level })}
        </Text>
        <View
          style={[styles.dots, rowDirection]}
          accessibilityLabel={format(s.traceCount, { n: traces.length, total: TRACES_PER_VISIT })}
        >
          {Array.from({ length: TRACES_PER_VISIT }, (_, i) => (
            <View key={i} style={[styles.dot, i < traces.length && styles.dotDone]} />
          ))}
        </View>
      </View>

      <View
        style={styles.canvasArea}
        accessibilityLabel={format(s.canvasLabel, { glyph: item.display })}
      >
        <TraceCanvas
          key={`${level}-${round}`}
          ref={canvas}
          item={item}
          level={level}
          size={canvasSize}
          leftHanded={leftHanded}
          onFeedback={onFeedback}
          onComplete={onComplete}
          onDemoEnd={onDemoEnd}
        />
        {showResult && lastStars !== undefined ? (
          <View style={styles.overlay} testID="trace-result">
            <Animated.View entering={ZoomIn} style={styles.resultCard}>
              <StarRow stars={lastStars} size={48} />
              <Text style={styles.stickers}>
                {[0, 1, 2]
                  .map(i => stickers[(traces.length + i) % Math.max(1, stickers.length)] ?? '⭐')
                  .join(' ')}
              </Text>
              {finishedVisit ? <Text style={styles.message}>{s.allDone}</Text> : null}
            </Animated.View>
          </View>
        ) : null}
      </View>

      <View style={[styles.controls, rowDirection]}>
        {showResult && finishedVisit ? (
          <>
            {level < 3 ? (
              <BigButton
                label={s.nextLevel}
                icon="⏭️"
                onPress={nextLevel}
                testID="trace-next-level"
              />
            ) : null}
            <BigButton
              label={s.done}
              icon="🏠"
              variant="secondary"
              onPress={onDone}
              testID="trace-done"
            />
          </>
        ) : showResult ? (
          <BigButton label={s.again} icon="✍️" onPress={traceAgain} testID="trace-again" />
        ) : (
          <>
            <BigButton
              label={s.watch}
              icon="👀"
              variant="surface"
              onPress={replay}
              testID="trace-watch"
            />
            <BigButton
              label={s.clear}
              icon="🧽"
              variant="surface"
              onPress={() => canvas.current?.clear()}
              testID="trace-clear"
            />
            {level < 3 ? (
              <BigButton
                label={s.nextLevel}
                icon="⏭️"
                variant="surface"
                onPress={nextLevel}
                testID="trace-next-level"
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  bigEmoji: { fontSize: 72 },
  message: {
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  subMessage: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statusRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
  rowReverse: { flexDirection: 'row-reverse' },
  levelText: { fontFamily: fonts.bengaliBold, fontSize: fontSize.sm, color: colors.textMuted },
  dots: { gap: spacing.sm },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  canvasArea: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  stickers: { fontSize: 40 },
  controls: {
    marginTop: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
