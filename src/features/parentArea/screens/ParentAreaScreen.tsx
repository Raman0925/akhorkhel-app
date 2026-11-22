import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import InAppReview from 'react-native-in-app-review';

import { PACKS } from '@/content';
import { useStrings } from '@/i18n';
import { STICKER_THEMES } from '@/monetization';
import type { ScreenProps } from '@/navigation';
import { MAX_PROFILES, useProfiles } from '@/progress';
import { useSettings, type UiLanguage } from '@/storage';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';
import { avatarEmoji, BigButton, Header, Screen } from '@/ui';

import { NoticeContent } from '../components/NoticeContent';
import { Choice, Paragraph, Row, Section, ToggleRow } from '../components/parts';
import { resetAllData } from '../resetAllData';
import { strings } from '../strings';

const UI_LANGUAGES: readonly { id: UiLanguage; label: string }[] = [
  { id: 'as', label: 'অসমীয়া' },
  { id: 'en', label: 'English' },
];

/**
 * Grown-up settings (reached only through ParentGate). While the ads & privacy notice is unseen
 * (first launch) it shows the notice first; accepting it during onboarding returns there.
 */
export function ParentAreaScreen({ navigation }: ScreenProps<'ParentArea'>) {
  const s = useStrings(strings);
  const adsNoticeSeen = useSettings(st => st.adsNoticeSeen);
  const onboarded = useSettings(st => st.onboarded);

  if (!adsNoticeSeen) {
    return (
      <Screen testID="screen-ParentArea">
        <Header title={s.noticeTitle} />
        <ScrollView contentContainerStyle={styles.content}>
          <NoticeContent />
          <BigButton
            label={s.noticeAccept}
            onPress={() => {
              useSettings.getState().markAdsNoticeSeen();
              if (!onboarded && navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            testID="ads-notice-accept"
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen testID="screen-ParentArea" banner>
      <Header title={s.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSection />
        <StickerSection />
        <ChildrenSection
          onEdit={id => navigation.navigate('ProfileEdit', { profileId: id })}
          onAdd={() => navigation.navigate('ProfileEdit', {})}
        />
        <RateCard />
        <Section title={s.more}>
          <Row
            icon="🧑‍🏫"
            label={s.teacher}
            onPress={() => navigation.navigate('Teacher')}
            testID="parent-teacher"
          />
          <Row
            icon="📢"
            label={s.adsNotice}
            onPress={() => navigation.navigate('AdsNotice')}
            testID="parent-ads-notice"
          />
          <Row
            icon="📄"
            label={s.privacyPolicy}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            testID="parent-privacy"
          />
        </Section>
        <DeleteAllSection
          onDeleted={() => navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] })}
        />
      </ScrollView>
    </Screen>
  );
}

function SettingsSection() {
  const s = useStrings(strings);
  const uiLanguage = useSettings(st => st.uiLanguage);
  const packId = useSettings(st => st.packId);
  const leftHanded = useSettings(st => st.leftHanded);
  const soundOn = useSettings(st => st.soundOn);
  const packs = PACKS.map(p => {
    const local = uiLanguage === 'as' ? p.language.nameAs : p.language.nameEn;
    const label = local === p.language.nameNative ? local : `${p.language.nameNative} (${local})`;
    return { id: p.id, label };
  });
  const { setUiLanguage, setPackId, setLeftHanded, setSoundOn } = useSettings.getState();

  return (
    <Section title={s.settings}>
      <Text style={styles.label}>{s.uiLanguage}</Text>
      <Choice
        options={UI_LANGUAGES}
        value={uiLanguage}
        onChange={setUiLanguage}
        testIDPrefix="parent-ui"
      />
      <Text style={styles.label}>{s.learningLanguage}</Text>
      <Choice options={packs} value={packId} onChange={setPackId} testIDPrefix="parent-pack" />
      <ToggleRow
        label={s.leftHanded}
        hint={s.leftHandedHint}
        value={leftHanded}
        onChange={setLeftHanded}
        onLabel={s.on}
        offLabel={s.off}
        testID="parent-left-handed"
      />
      <ToggleRow
        label={s.sound}
        value={soundOn}
        onChange={setSoundOn}
        onLabel={s.on}
        offLabel={s.off}
        testID="parent-sound"
      />
    </Section>
  );
}

/** Celebration sticker theme. Every theme is free; the parent simply picks one. */
function StickerSection() {
  const s = useStrings(strings);
  const stickerTheme = useSettings(st => st.stickerTheme);
  const options = STICKER_THEMES.map(t => ({
    id: t.id,
    label: `${t.emoji[0] ?? ''} ${themeName(s, t.id)}`,
  }));
  return (
    <Section title={s.stickerThemes}>
      <Paragraph>{s.stickerThemesHint}</Paragraph>
      <Choice
        options={options}
        value={stickerTheme}
        onChange={id => useSettings.getState().setStickerTheme(id)}
        testIDPrefix="parent-sticker"
      />
    </Section>
  );
}

type S = (typeof strings)['en'];

function themeName(s: S, id: string): string {
  const key = `theme_${id}`;
  return key in s ? s[key as keyof S] : id;
}

function ChildrenSection({ onEdit, onAdd }: { onEdit: (id: string) => void; onAdd: () => void }) {
  const s = useStrings(strings);
  const profiles = useProfiles(st => st.profiles);
  return (
    <Section title={`${s.children} (${profiles.length}/${MAX_PROFILES})`}>
      {profiles.map(p => (
        <Row
          key={p.id}
          icon={avatarEmoji(p.avatar)}
          label={p.nickname}
          detail="✏️"
          onPress={() => onEdit(p.id)}
          testID={`parent-child-${p.id}`}
        />
      ))}
      {profiles.length < MAX_PROFILES ? (
        <Row icon="➕" label={s.addChild} onPress={onAdd} testID="parent-add-child" />
      ) : null}
    </Section>
  );
}

/** Play In-App Review, offered once after the 3rd completed session (handover section 9). */
function RateCard() {
  const s = useStrings(strings);
  const show = useSettings(st => st.completedSessions >= 3 && !st.reviewRequested);
  if (!show) {
    return null;
  }
  const onRate = async () => {
    try {
      if (InAppReview.isAvailable()) {
        await InAppReview.RequestInAppReview();
      }
    } catch (e) {
      console.warn('[review] request failed', e);
    } finally {
      useSettings.getState().markReviewRequested();
    }
  };
  return (
    <View style={styles.rate} testID="parent-rate-card">
      <Text style={styles.rateTitle}>⭐ {s.rateTitle}</Text>
      <Paragraph>{s.rateBody}</Paragraph>
      <BigButton label={s.rateButton} onPress={onRate} testID="parent-rate" />
    </View>
  );
}

function DeleteAllSection({ onDeleted }: { onDeleted: () => void }) {
  const s = useStrings(strings);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  return (
    <Section title={s.dangerZone}>
      {stage === 0 ? (
        <BigButton
          label={s.deleteAll}
          icon="🗑️"
          variant="surface"
          onPress={() => setStage(1)}
          testID="parent-delete-all"
        />
      ) : (
        <View style={styles.confirm}>
          <Paragraph testID={`parent-delete-all-stage-${stage}`}>
            {stage === 1 ? s.deleteAllConfirm1 : s.deleteAllConfirm2}
          </Paragraph>
          <BigButton
            label={stage === 1 ? s.deleteAllContinue : s.deleteAllFinal}
            onPress={() => {
              if (stage === 1) {
                setStage(2);
              } else {
                resetAllData();
                onDeleted();
              }
            }}
            testID="parent-delete-all-confirm"
          />
          <BigButton
            label={s.cancel}
            variant="surface"
            onPress={() => setStage(0)}
            testID="parent-delete-all-cancel"
          />
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  label: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  rate: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  rateTitle: { fontFamily: fonts.bengaliBold, fontSize: fontSize.md, color: colors.text },
  confirm: { gap: spacing.sm },
});
