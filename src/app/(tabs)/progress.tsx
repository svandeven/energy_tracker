import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CompletionChart } from '../../components/CompletionChart';
import { ScreenTop } from '../../components/ScreenTop';
import { Text } from '../../components/Text';
import { cardShadow, colors, radii } from '../../theme';
import { completionSeries, currentStreak, reliableGoals } from '../../lib/goals';
import { useI18n } from '../../i18n';
import { useGoals } from '../../providers/GoalsProvider';

/** Readable green for good percentages on white. */
const GOOD = '#3F7D55';

const percent = (value: number | null) => (value == null ? '–' : `${Math.round(value * 100)}%`);

export default function ProgressScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { date, goals, stats, loading, reload } = useGoals();

  const series = useMemo(() => completionSeries(stats, date), [stats, date]);
  const average = series[series.length - 1]?.average ?? null;
  const streak = useMemo(() => currentStreak(stats, date), [stats, date]);
  const reliable = useMemo(() => reliableGoals(goals, date), [goals, date]);
  const hasData = stats.some((s) => s.total > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        <ScreenTop title={t('progress.title')} subtitle={t('progress.subtitle')} />

        {!hasData && (
          <View style={styles.card}>
            <Text variant="small" color={colors.inkMuted}>
              {t('progress.noData')}
            </Text>
          </View>
        )}

        <View style={styles.stats}>
          <View style={[styles.card, styles.stat]}>
            <Text variant="caption" color={colors.inkMuted}>
              {t('progress.average')}
            </Text>
            <Text variant="title" color={colors.primary}>
              {percent(average)}
            </Text>
          </View>
          <View style={[styles.card, styles.stat]}>
            <Text variant="caption" color={colors.inkMuted}>
              {t('progress.streak')}
            </Text>
            <Text variant="title" color={GOOD}>
              {streak === 1 ? t('progress.daysOne') : t('progress.daysOther', { count: streak })}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="smallStrong">{t('progress.completion')}</Text>
            <Text variant="caption" color={colors.inkMuted}>
              {t('progress.last7')}
            </Text>
          </View>
          <CompletionChart points={series} />
        </View>

        <View style={styles.card}>
          <Text variant="smallStrong" style={styles.cardTitle}>
            {t('progress.reliable')}
          </Text>
          {reliable.length === 0 ? (
            <Text variant="small" color={colors.inkMuted}>
              {t('progress.reliableEmpty')}
            </Text>
          ) : (
            reliable.map((goal) => (
              <View key={goal.title} style={styles.reliableRow}>
                <Text variant="small" style={styles.flex}>
                  {goal.title}
                </Text>
                <Text variant="smallStrong" color={goal.rate >= 0.7 ? GOOD : colors.accent}>
                  {percent(goal.rate)}
                </Text>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={() => router.push('/history')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, styles.link, pressed && styles.pressed]}
        >
          <Ionicons name="analytics-outline" size={20} color={colors.accent} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t('progress.energyHistory')}</Text>
            <Text variant="caption" color={colors.inkMuted}>
              {t('progress.energyHistorySub')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 12,
    ...cardShadow,
  },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { marginBottom: 10 },
  reliableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.7 },
});
