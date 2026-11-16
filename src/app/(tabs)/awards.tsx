import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HeroCard } from '../../components/HeroCard';
import { ScreenTop } from '../../components/ScreenTop';
import { Text } from '../../components/Text';
import { cardShadow, colors, radii } from '../../theme';
import { type Award, type AwardId, computeAwards, nextAward } from '../../lib/goals';
import { type TranslationKey, useI18n } from '../../i18n';
import { useGoals } from '../../providers/GoalsProvider';

const BADGES: Record<
  AwardId,
  { title: TranslationKey; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  firstDay: { title: 'awards.firstDay', icon: 'star', color: colors.yellow },
  weekly: { title: 'awards.weekly', icon: 'calendar', color: colors.done },
  monthly: { title: 'awards.monthly', icon: 'medal', color: colors.primary },
  hundred: { title: 'awards.hundred', icon: 'trophy', color: colors.accent },
};

export default function AwardsScreen() {
  const { t } = useI18n();
  const { date, stats, loading, reload } = useGoals();

  const awards = useMemo(() => computeAwards(stats, date), [stats, date]);
  const next = nextAward(awards);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        <ScreenTop title={t('awards.title')} subtitle={t('awards.subtitle')} />

        <HeroCard
          label={t('awards.next')}
          value={t(BADGES[next.id].title)}
          detail={
            next.remaining === 1
              ? t('awards.toGoOne')
              : t('awards.toGoOther', { count: next.remaining })
          }
          icon="ribbon"
        />

        <View style={styles.grid}>
          {awards.map((award) => (
            <Badge key={award.id} award={award} />
          ))}
        </View>

        <Text variant="caption" color={colors.inkMuted} style={styles.howItWorks}>
          {t('awards.howItWorks')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({ award }: { award: Award }) {
  const { t, fmt } = useI18n();
  const badge = BADGES[award.id];
  const earned = award.count > 0 && award.earnedOn != null;

  let caption: string;
  if (earned && award.earnedOn) {
    caption =
      award.count > 1
        ? t('awards.earnedTimes', { date: fmt.axisDate(award.earnedOn), count: award.count })
        : t('awards.earnedOn', { date: fmt.axisDate(award.earnedOn) });
  } else if (award.id === 'firstDay') {
    caption = t('awards.firstDayHint');
  } else {
    caption = t('awards.progress', { done: award.progress, target: award.target });
  }

  return (
    <View style={styles.badge} accessible accessibilityLabel={`${t(badge.title)}. ${caption}`}>
      <View style={[styles.badgeIcon, { backgroundColor: earned ? badge.color : colors.tint }]}>
        <Ionicons name={badge.icon} size={22} color={earned ? colors.white : colors.primary} />
      </View>
      <Text variant="smallStrong" center>
        {t(badge.title)}
      </Text>
      <Text variant="caption" color={colors.inkMuted} center>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingVertical: 18,
    paddingHorizontal: 12,
    ...cardShadow,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  howItWorks: { marginTop: 18 },
});
