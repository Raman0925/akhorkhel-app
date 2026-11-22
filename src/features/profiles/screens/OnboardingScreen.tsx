import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { audio } from '@/audio';
import { PACKS, type Pack } from '@/content';
import { useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { useProfiles, type AvatarId } from '@/progress';
import { useSettings, type UiLanguage } from '@/storage';
import { colors, fontForScript, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';
import { BigButton, Header, Screen } from '@/ui';

import { ProfileForm } from '../components/ProfileForm';
import { strings } from '../strings';

type Step = 'language' | 'grownUps' | 'profile';

/**
 * First launch: 1) pick the learning language, 2) a grown-up passes the parent gate and reads the
 * ads & privacy notice (shown by the parent area while it is unseen), 3) create the first child.
 */
export function OnboardingScreen({ navigation }: ScreenProps<'Onboarding'>) {
  const s = useStrings(strings);
  const packId = useSettings(st => st.packId);
  const setPackId = useSettings(st => st.setPackId);
  const adsNoticeSeen = useSettings(st => st.adsNoticeSeen);
  const [step, setStep] = useState<Step>('language');

  // Coming back from the parent gate + notice: move on to the child's profile.
  useEffect(() => {
    if (step === 'grownUps' && adsNoticeSeen) {
      setStep('profile');
    }
  }, [step, adsNoticeSeen]);

  const finish = (nickname: string, avatar: AvatarId) => {
    const profile = useProfiles.getState().addProfile(nickname, avatar);
    if (!profile) {
      return;
    }
    useProfiles.getState().selectProfile(profile.id);
    useSettings.getState().completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <Screen
      testID="screen-Onboarding"
      prompt={
        step === 'language' ? 'chooseLanguage' : step === 'grownUps' ? 'askParent' : undefined
      }
    >
      {step === 'language' ? (
        <>
          <Header title={s.chooseLanguageTitle} prompt="chooseLanguage" showBack={false} />
          <UiLanguageToggle />
          <ScrollView contentContainerStyle={styles.list}>
            {PACKS.map(pack => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={pack.id === packId}
                onPress={() => setPackId(pack.id)}
              />
            ))}
          </ScrollView>
          <BigButton
            label={s.continue}
            icon="➡️"
            testID="onboarding-continue"
            onPress={() => setStep(adsNoticeSeen ? 'profile' : 'grownUps')}
          />
        </>
      ) : null}

      {step === 'grownUps' ? (
        <>
          <Header title={s.grownUpsTitle} prompt="askParent" showBack={false} />
          <View style={styles.center}>
            <Text style={styles.big}>🧑‍🏫</Text>
            <Text style={styles.body}>{s.grownUpsBody}</Text>
          </View>
          <BigButton
            label={s.grownUpsButton}
            icon="🔒"
            testID="onboarding-grownup"
            onPress={() => navigation.navigate('ParentGate', { next: 'ParentArea' })}
          />
        </>
      ) : null}

      {step === 'profile' ? (
        <>
          <Header title={s.firstProfileTitle} showBack={false} />
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            <ProfileForm onSave={finish} />
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}

function PackCard({
  pack,
  selected,
  onPress,
}: {
  pack: Pack;
  selected: boolean;
  onPress: () => void;
}) {
  const uiLanguage = useSettings(st => st.uiLanguage);
  const localName = uiLanguage === 'as' ? pack.language.nameAs : pack.language.nameEn;
  return (
    <Pressable
      testID={`onboarding-pack-${pack.id}`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${pack.language.nameNative}, ${localName}`}
      onPress={() => {
        audio.sfx('pop');
        onPress();
      }}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <Text style={[styles.cardNative, { fontFamily: fontForScript(pack.script, true) }]}>
        {pack.language.nameNative}
      </Text>
      {localName !== pack.language.nameNative ? (
        <Text style={styles.cardLocal}>{localName}</Text>
      ) : null}
      {selected ? <Text style={styles.check}>✔️</Text> : null}
    </Pressable>
  );
}

const UI_LANGUAGES: { id: UiLanguage; label: string }[] = [
  { id: 'as', label: 'অসমীয়া' },
  { id: 'en', label: 'English' },
];

function UiLanguageToggle() {
  const s = useStrings(strings);
  const uiLanguage = useSettings(st => st.uiLanguage);
  const setUiLanguage = useSettings(st => st.setUiLanguage);
  return (
    <View style={styles.toggleRow} accessibilityLabel={s.uiLanguageLabel}>
      {UI_LANGUAGES.map(l => {
        const selected = l.id === uiLanguage;
        return (
          <Pressable
            key={l.id}
            testID={`onboarding-ui-${l.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={l.label}
            onPress={() => setUiLanguage(l.id)}
            style={[styles.toggle, selected && styles.toggleSelected]}
          >
            <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>
              {l.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  big: { fontSize: 72 },
  body: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  card: {
    minHeight: MIN_TOUCH * 2,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  cardSelected: { borderColor: colors.secondary, backgroundColor: colors.surfaceAlt },
  cardNative: { fontSize: fontSize.xl, color: colors.text },
  cardLocal: { fontFamily: fonts.bengali, fontSize: fontSize.md, color: colors.textMuted },
  check: { position: 'absolute', top: spacing.sm, right: spacing.sm, fontSize: 24 },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggle: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH * 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSelected: { backgroundColor: colors.sky, borderColor: colors.sky },
  toggleText: { fontFamily: fonts.bengali, fontSize: fontSize.md, color: colors.text },
  toggleTextSelected: { color: colors.onPrimary },
});
