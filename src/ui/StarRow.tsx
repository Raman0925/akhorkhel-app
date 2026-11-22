import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Stars } from '@/progress';
import { colors } from '@/theme';

/** 0–3 stars. Empty stars are soft, never "failed" (no red, no crosses). */
export function StarRow({ stars, size = 28 }: { stars: Stars; size?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`${stars} / 3`} accessible>
      {[1, 2, 3].map(i => (
        <Text
          key={i}
          style={[
            styles.star,
            { fontSize: size, color: i <= stars ? colors.accent : colors.border },
          ]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  star: { lineHeight: undefined },
});
