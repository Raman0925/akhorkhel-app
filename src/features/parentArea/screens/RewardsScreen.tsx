import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { format, useStrings } from '@/i18n';
import { STICKER_THEMES, useUnlocks, type RewardId, type StickerTheme } from '@/monetization';
import type { ScreenProps } from '@/navigation';
import { useSettings } from '@/storage';
import { colors, fonts, fontSize, radius, spacing } from '@/theme';
import { BigButton, Header, Screen } from '@/ui';

import { Paragraph } from '../components/parts';
import { remaining } from '../remaining';
import { strings } from '../strings';

type S = (typeof strings)['en'];

/** Opt-in rewarded ads for grown-ups: unlock a sticker theme or bonus words for 24 h. */
export function RewardsScreen(_props: ScreenProps<'Rewards'>) {
  const s = useStrings(strings);
  const now = useNow();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Screen testID="screen-Rewards" banner>
      <Header title={s.rewardsTitle} />
      <ScrollView contentContainerStyle={styles.content}>
        <Paragraph>{s.rewardsIntro}</Paragraph>
        {message ? (
          <Text style={styles.message} testID="rewards-message" accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
        <Text style={styles.heading} accessibilityRole="header">
          {s.stickerThemes}
        </Text>
        {STICKER_THEMES.map(theme => (
          <ThemeCard key={theme.id} theme={theme} now={now} onMessage={setMessage} />
        ))}
        <Text style={styles.heading} accessibilityRole="header">
          {s.bonusWords}
        </Text>
        <RewardCard
          id="bonusWords"
          title={s.bonusWords}
          preview="📚"
          body={s.bonusWordsBody}
          now={now}
          onMessage={setMessage}
        />
      </ScrollView>
    </Screen>
  );
}

function ThemeCard({
  theme,
  now,
  onMessage,
}: {
  theme: StickerTheme;
  now: number;
  onMessage: (m: string | null) => void;
}) {
  const s = useStrings(strings);
  const selected = useSettings(st => st.stickerTheme === theme.id);
  const title = themeName(s, theme.id);
  return (
    <RewardCard
      id={`theme:${theme.id}`}
      title={title}
      preview={theme.emoji.join(' ')}
      free={theme.free}
      now={now}
      onMessage={onMessage}
      testID={`rewards-theme-${theme.id}`}
      select={{
        selected,
        onSelect: () => useSettings.getState().setStickerTheme(theme.id),
      }}
    />
  );
}

function RewardCard({
  id,
  title,
  preview,
  body,
  free = false,
  now,
  onMessage,
  select,
  testID = `rewards-${id}`,
}: {
  id: RewardId;
  title: string;
  preview: string;
  body?: string;
  free?: boolean;
  now: number;
  onMessage: (m: string | null) => void;
  select?: { selected: boolean; onSelect: () => void };
  testID?: string;
}) {
  const s = useStrings(strings);
  const { unlockedUntil, watchRewarded, rewardedReady } = useUnlocks();
  const [busy, setBusy] = useState(false);
  const left = free ? null : remaining(unlockedUntil(id), now);
  const available = free || left !== null;

  const onWatch = async () => {
    setBusy(true);
    onMessage(null);
    try {
      const earned = await watchRewarded(id);
      if (!earned) {
        onMessage(s.adNoReward);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.status} testID={`${testID}-status`}>
          {free
            ? s.free
            : left
              ? format(s.unlockedFor, {
                  time:
                    left.h > 0
                      ? format(s.hoursMinutes, { h: left.h, m: left.m })
                      : format(s.minutes, { m: left.m }),
                })
              : '🔒'}
        </Text>
      </View>
      <Text style={styles.preview}>{preview}</Text>
      {body ? <Paragraph>{body}</Paragraph> : null}
      {!available ? (
        <>
          <BigButton
            label={s.watchAd}
            icon="▶️"
            variant="secondary"
            disabled={busy || !rewardedReady}
            onPress={onWatch}
            testID={`${testID}-watch`}
          />
          {!rewardedReady ? <Text style={styles.note}>{s.adNotReady}</Text> : null}
        </>
      ) : null}
      {available && select ? (
        <BigButton
          label={select.selected ? `✔️ ${s.inUse}` : s.use}
          variant={select.selected ? 'surface' : 'primary'}
          disabled={select.selected}
          onPress={select.onSelect}
          testID={`${testID}-use`}
        />
      ) : null}
    </View>
  );
}

function themeName(s: S, id: string): string {
  const key = `theme_${id}`;
  return key in s ? s[key as keyof S] : id;
}

/** Current time, refreshed every 30 s so remaining unlock time stays fresh. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  heading: {
    fontFamily: fonts.bengaliBold,
    fontSize: fontSize.lg,
    color: colors.text,
    marginTop: spacing.sm,
  },
  message: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: fonts.bengaliBold, fontSize: fontSize.md, color: colors.text },
  status: { fontFamily: fonts.bengali, fontSize: fontSize.sm, color: colors.textMuted },
  preview: { fontSize: 36, textAlign: 'center' },
  note: {
    fontFamily: fonts.bengali,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
