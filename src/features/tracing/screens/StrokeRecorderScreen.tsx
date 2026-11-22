/**
 * Stroke Recorder (developer tool; the route is registered only in __DEV__). A native writer picks an
 * item, writes its strokes in order over the outline, previews the order, and exports the geometry
 * entry as JSON through the share sheet, to paste into src/content/packs/<id>/geometry.json.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Share from 'react-native-share';

import type { Traceable } from '@/content';
import { format, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fonts, fontSize, spacing } from '@/theme';
import { BigButton, Header, Screen, usePack } from '@/ui';

import { geometryJson, normaliseRecordedStroke } from '../recorder/exportGeometry';
import { RecorderCanvas } from '../recorder/RecorderCanvas';
import { strings } from '../strings';
import { findTraceable, packTraceables } from '../traceables';

export function StrokeRecorderScreen({ route }: ScreenProps<'StrokeRecorder'>) {
  const pack = usePack();
  const s = useStrings(strings);
  const [pickedKey, setPickedKey] = useState(route.params?.itemKey);
  const items = useMemo(() => packTraceables(pack), [pack]);
  const item = pickedKey ? findTraceable(pack, pickedKey) : undefined;

  if (item) {
    return <Recorder key={item.key} item={item} onBack={() => setPickedKey(undefined)} />;
  }

  return (
    <Screen banner={false} testID="screen-StrokeRecorder">
      <Header title={s.recTitle} />
      <Text style={styles.label}>{s.recPick}</Text>
      {items.length === 0 ? (
        <Text style={styles.label} testID="recorder-empty">
          {s.recEmpty}
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={t => t.key}
          numColumns={4}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item: t }) => (
            <BigButton
              label={t.display}
              variant={t.strokeSource === 'auto' ? 'surface' : 'secondary'}
              onPress={() => setPickedKey(t.key)}
              testID={`recorder-item-${t.key}`}
            />
          )}
        />
      )}
    </Screen>
  );
}

function Recorder({ item, onBack }: { item: Traceable; onBack: () => void }) {
  const s = useStrings(strings);
  const { width, height } = useWindowDimensions();
  const size = Math.max(200, Math.min(width - spacing.md * 2, height * 0.6));
  const [strokes, setStrokes] = useState<[number, number][][]>([]);
  const [previewToken, setPreviewToken] = useState(0);

  const onStroke = useCallback(
    (flat: number[]) => {
      const stroke = normaliseRecordedStroke(flat, size);
      if (stroke.length >= 2) {
        setStrokes(prev => [...prev, stroke]);
      }
    },
    [size],
  );

  const exportJson = () => {
    Share.open({
      title: item.key,
      message: geometryJson(item, strokes),
      failOnCancel: false,
    }).catch((e: unknown) => console.warn('[recorder] share failed', e));
  };

  return (
    <Screen banner={false} testID="screen-StrokeRecorder">
      <Header
        title={`${item.display}  ${item.key}`}
        right={<BigButton label="↩" onPress={onBack} variant="surface" testID="recorder-back" />}
      />
      <Text style={styles.label} testID="recorder-count">
        {format(s.recStrokes, { n: strokes.length })}
      </Text>
      <View style={styles.center}>
        <RecorderCanvas
          size={size}
          outline={item.outline}
          strokes={strokes}
          onStroke={onStroke}
          previewToken={previewToken}
        />
      </View>
      <View style={styles.controls}>
        <BigButton
          label={s.recUndo}
          variant="surface"
          onPress={() => setStrokes(prev => prev.slice(0, -1))}
          disabled={strokes.length === 0}
          testID="recorder-undo"
        />
        <BigButton
          label={s.recClear}
          variant="surface"
          onPress={() => setStrokes([])}
          disabled={strokes.length === 0}
          testID="recorder-clear"
        />
        <BigButton
          label={s.recPreview}
          variant="surface"
          onPress={() => setPreviewToken(t => t + 1)}
          disabled={strokes.length === 0}
          testID="recorder-preview"
        />
        <BigButton
          label={s.recExport}
          onPress={exportJson}
          disabled={strokes.length === 0}
          testID="recorder-export"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.latin,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  grid: { gap: spacing.sm, paddingBottom: spacing.xl },
  gridRow: { gap: spacing.sm },
  center: { alignItems: 'center' },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});
