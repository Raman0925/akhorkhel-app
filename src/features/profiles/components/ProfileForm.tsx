import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { audio } from '@/audio';
import { useStrings } from '@/i18n';
import { AVATARS, cleanNickname, MAX_NICKNAME_LENGTH, type AvatarId } from '@/progress';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';
import { BigButton } from '@/ui';

import { AVATAR_EMOJI } from '../avatars';
import { strings } from '../strings';

type Props = {
  initialNickname?: string;
  initialAvatar?: AvatarId;
  onSave: (nickname: string, avatar: AvatarId) => void;
};

/** Nickname + avatar: the only things a profile holds (no real names, photos or ages). */
export function ProfileForm({ initialNickname = '', initialAvatar = 'rhino', onSave }: Props) {
  const s = useStrings(strings);
  const [nickname, setNickname] = useState(initialNickname);
  const [avatar, setAvatar] = useState<AvatarId>(initialAvatar);
  const valid = cleanNickname(nickname).length > 0;

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{s.nicknameLabel}</Text>
      <TextInput
        testID="profile-nickname"
        value={nickname}
        onChangeText={setNickname}
        maxLength={MAX_NICKNAME_LENGTH}
        placeholder={s.nicknamePlaceholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        accessibilityLabel={s.nicknameLabel}
        accessibilityHint={s.nicknameHint}
        style={styles.input}
      />
      <Text style={styles.hint}>{s.nicknameHint}</Text>

      <Text style={styles.label}>{s.avatarLabel}</Text>
      <View style={styles.avatars}>
        {AVATARS.map(id => {
          const selected = id === avatar;
          return (
            <Pressable
              key={id}
              testID={`avatar-${id}`}
              accessibilityRole="radio"
              accessibilityLabel={s[`avatar_${id}`]}
              accessibilityState={{ selected }}
              onPress={() => {
                audio.sfx('pop');
                setAvatar(id);
              }}
              style={[styles.avatar, selected && styles.avatarSelected]}
            >
              <Text style={styles.avatarEmoji}>{AVATAR_EMOJI[id]}</Text>
            </Pressable>
          );
        })}
      </View>

      <BigButton
        label={s.save}
        icon={AVATAR_EMOJI[avatar]}
        disabled={!valid}
        onPress={() => onSave(cleanNickname(nickname), avatar)}
        testID="profile-save"
        style={styles.save}
      />
    </View>
  );
}

const TILE = MIN_TOUCH + 8;

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  label: {
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
  input: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bengali,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  hint: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  avatar: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: { borderColor: colors.secondary, backgroundColor: colors.surfaceAlt },
  avatarEmoji: { fontSize: 40 },
  save: { marginTop: spacing.md },
});
