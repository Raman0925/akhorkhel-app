import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { spacing } from '@/theme';

import { strings } from '../strings';
import { Paragraph, Row } from './parts';

/** The plain-language ads & privacy notice (first launch, and from the parent area). */
export function NoticeContent() {
  const s = useStrings(strings);
  const navigation = useNavigation();
  return (
    <View style={styles.root} testID="ads-notice-content">
      <Paragraph>💚 {s.notice1}</Paragraph>
      <Paragraph>👶 {s.notice2}</Paragraph>
      <Paragraph>✏️ {s.notice3}</Paragraph>
      <Paragraph>📱 {s.notice4}</Paragraph>
      <Paragraph>🎁 {s.notice5}</Paragraph>
      <Row
        icon="📄"
        label={s.noticePolicyLink}
        onPress={() => navigation.navigate('PrivacyPolicy')}
        testID="ads-notice-policy"
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: spacing.md } });
