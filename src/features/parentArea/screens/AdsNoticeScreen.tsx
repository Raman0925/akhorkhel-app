import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { useSettings } from '@/storage';
import { spacing } from '@/theme';
import { BigButton, Header, Screen } from '@/ui';

import { NoticeContent } from '../components/NoticeContent';
import { strings } from '../strings';

/** The ads & privacy notice, opened again from the parent area. */
export function AdsNoticeScreen({ navigation }: ScreenProps<'AdsNotice'>) {
  const s = useStrings(strings);
  return (
    <Screen testID="screen-AdsNotice">
      <Header title={s.noticeTitle} />
      <ScrollView contentContainerStyle={styles.content}>
        <NoticeContent />
        <BigButton
          label={s.noticeAccept}
          onPress={() => {
            useSettings.getState().markAdsNoticeSeen();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          testID="ads-notice-accept"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.lg, paddingBottom: spacing.xl } });
