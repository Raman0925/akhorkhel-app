import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { colors, fonts, fontSize, spacing } from '@/theme';
import { Header, Screen } from '@/ui';

import { Heading, Paragraph } from '../components/parts';
import { PRIVACY_POLICY_URL, strings } from '../strings';

/** Static privacy summary. The full policy URL is shown as selectable text (no network from here). */
export function PrivacyPolicyScreen(_props: ScreenProps<'PrivacyPolicy'>) {
  const s = useStrings(strings);
  return (
    <Screen testID="screen-PrivacyPolicy">
      <Header title={s.policyTitle} />
      <ScrollView contentContainerStyle={styles.content}>
        <Paragraph>{s.policyIntro}</Paragraph>
        <Text selectable style={styles.url} testID="privacy-url">
          {PRIVACY_POLICY_URL}
        </Text>
        <Heading>{s.policyAppHeading}</Heading>
        <Paragraph>{s.policyApp}</Paragraph>
        <Heading>{s.policyAdsHeading}</Heading>
        <Paragraph>{s.policyAds}</Paragraph>
        <Heading>{s.policyAdIdHeading}</Heading>
        <Paragraph>{s.policyAdId}</Paragraph>
        <Heading>{s.policyDeleteHeading}</Heading>
        <Paragraph>{s.policyDelete}</Paragraph>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xl },
  url: { fontFamily: fonts.latinBold, fontSize: fontSize.sm, color: colors.sky },
});
