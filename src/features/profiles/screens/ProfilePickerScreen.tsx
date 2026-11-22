import React, { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { audio } from '@/audio';
import { useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { useProfiles, type Profile } from '@/progress';
import { colors, fonts, fontSize, MIN_TOUCH, radius, spacing } from '@/theme';
import { Header, Screen } from '@/ui';

import { avatarEmoji } from '@/ui';
import { strings } from '../strings';

const ADD = '__add__';
type Tile = Profile | typeof ADD;

/** "Who is playing?" grid. Tap a child to play; editing and removing live in the parent area. */
export function ProfilePickerScreen({ navigation }: ScreenProps<'ProfilePicker'>) {
  const s = useStrings(strings);
  const profiles = useProfiles(st => st.profiles);
  const currentId = useProfiles(st => st.currentId);
  const data: Tile[] = [...profiles, ADD];

  const onPick = useCallback(
    (id: string) => {
      useProfiles.getState().selectProfile(id);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    },
    [navigation],
  );

  return (
    <Screen testID="screen-ProfilePicker" prompt="chooseProfile">
      <Header title={s.pickerTitle} prompt="chooseProfile" />
      <FlatList
        data={data}
        numColumns={3}
        keyExtractor={item => (item === ADD ? ADD : item.id)}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) =>
          item === ADD ? (
            <Pressable
              testID="profile-add"
              accessibilityRole="button"
              accessibilityLabel={s.addProfile}
              onPress={() => {
                audio.sfx('tap');
                navigation.navigate('ProfileEdit', {});
              }}
              style={[styles.tile, styles.addTile]}
            >
              <Text style={styles.emoji}>➕</Text>
              <Text style={styles.name} numberOfLines={1}>
                {s.addProfile}
              </Text>
            </Pressable>
          ) : (
            <ProfileTile profile={item} selected={item.id === currentId} onPick={onPick} />
          )
        }
      />
    </Screen>
  );
}

const ProfileTile = memo(function ProfileTileInner({
  profile,
  selected,
  onPick,
}: {
  profile: Profile;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <Pressable
      testID={`profile-tile-${profile.id}`}
      accessibilityRole="button"
      accessibilityLabel={profile.nickname}
      accessibilityState={{ selected }}
      onPress={() => {
        audio.sfx('pop');
        onPick(profile.id);
      }}
      style={[styles.tile, selected && styles.selected]}
    >
      <Text style={styles.emoji}>{avatarEmoji(profile.avatar)}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {profile.nickname}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  row: { gap: spacing.md },
  tile: {
    flex: 1 / 3,
    minHeight: MIN_TOUCH * 2,
    minWidth: MIN_TOUCH,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  selected: { borderColor: colors.secondary },
  addTile: { borderStyle: 'dashed', backgroundColor: colors.surfaceAlt },
  emoji: { fontSize: 48 },
  name: { fontFamily: fonts.bengaliBold, fontSize: fontSize.sm, color: colors.text },
});
