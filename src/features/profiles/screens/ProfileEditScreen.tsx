import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { format, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { MAX_PROFILES, useProfiles, useProgress, type AvatarId } from '@/progress';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';
import { BigButton, Header, Screen } from '@/ui';

import { ProfileForm } from '../components/ProfileForm';
import { strings } from '../strings';

/** Add a child (no `profileId`) or edit/remove one. */
export function ProfileEditScreen({ navigation, route }: ScreenProps<'ProfileEdit'>) {
  const s = useStrings(strings);
  const profileId = route.params?.profileId;
  const profile = useProfiles(st => st.profiles.find(p => p.id === profileId));
  const count = useProfiles(st => st.profiles.length);
  const [confirming, setConfirming] = useState(false);

  const isNew = !profile;
  const full = isNew && count >= MAX_PROFILES;

  const leave = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'ProfilePicker' }] });
    }
  };

  const onSave = (nickname: string, avatar: AvatarId) => {
    if (profile) {
      useProfiles.getState().updateProfile(profile.id, { nickname, avatar });
      leave();
      return;
    }
    if (useProfiles.getState().addProfile(nickname, avatar)) {
      leave();
    }
  };

  const onDelete = () => {
    if (!profile) {
      return;
    }
    useProgress.getState().clearProfile(profile.id);
    useProfiles.getState().removeProfile(profile.id);
    if (useProfiles.getState().profiles.length === 0) {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    } else {
      leave();
    }
  };

  return (
    <Screen testID="screen-ProfileEdit">
      <Header title={isNew ? s.newProfileTitle : s.editProfileTitle} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {full ? (
          <Text style={styles.message} testID="profile-limit">
            {format(s.limitReached, { max: MAX_PROFILES })}
          </Text>
        ) : (
          <ProfileForm
            key={profile?.id ?? 'new'}
            initialNickname={profile?.nickname}
            initialAvatar={profile?.avatar}
            onSave={onSave}
          />
        )}

        {profile && !confirming ? (
          <BigButton
            label={s.delete}
            icon="🗑️"
            variant="surface"
            onPress={() => setConfirming(true)}
            testID="profile-delete"
            style={styles.delete}
          />
        ) : null}
        {profile && confirming ? (
          <View style={styles.confirm}>
            <Text style={styles.message}>
              {format(s.deleteConfirm, { name: profile.nickname })}
            </Text>
            <BigButton label={s.deleteYes} onPress={onDelete} testID="profile-delete-confirm" />
            <BigButton
              label={s.cancel}
              variant="surface"
              onPress={() => setConfirming(false)}
              testID="profile-delete-cancel"
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  message: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  delete: { marginTop: spacing.lg },
  confirm: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
});
