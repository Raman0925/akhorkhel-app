import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { common, useStrings } from '@/i18n';
import type { ScreenProps } from '@/navigation';
import { bestStars, useCurrentProfile, usePackProgress } from '@/progress';
import { spacing } from '@/theme';
import { BigButton, Header, Screen, StarRow, usePack } from '@/ui';

import { gameAvailability } from '../logic/availability';
import { strings } from '../strings';

export function GamesHubScreen({ navigation }: ScreenProps<'GamesHub'>) {
  const pack = usePack();
  const s = useStrings(strings);
  const c = useStrings(common);
  const profile = useCurrentProfile();
  const progress = usePackProgress(profile?.id ?? null, pack.id);
  const available = useMemo(() => gameAvailability(pack), [pack]);

  return (
    <Screen prompt="home" testID="screen-GamesHub">
      <Header title={c.games} prompt="home" />
      <View style={styles.list}>
        {available.hear ? (
          <View style={styles.item}>
            <BigButton
              icon="👂"
              label={s.hearTitle}
              onPress={() => navigation.navigate('GameHear')}
              style={styles.button}
              testID="games-hear"
            />
            <StarRow stars={bestStars(progress['game:hear'])} />
          </View>
        ) : null}
        {available.picture ? (
          <View style={styles.item}>
            <BigButton
              icon="🖼️"
              label={s.pictureTitle}
              variant="secondary"
              onPress={() => navigation.navigate('GamePicture')}
              style={styles.button}
              testID="games-picture"
            />
            <StarRow stars={bestStars(progress['game:picture'])} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  item: { alignItems: 'center', gap: spacing.sm },
  button: { alignSelf: 'stretch', minHeight: 140 },
});
