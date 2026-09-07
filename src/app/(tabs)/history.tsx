import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/AppHeader';
import { Card } from '../../components/Card';
import { EnergyChart, type ChartPoint } from '../../components/EnergyChart';
import { Text } from '../../components/Text';
import { colors, totalColor } from '../../theme';
import { formatShortDate, today } from '../../lib/dates';
import {
  breakdownLine,
  compareWeeks,
  dayTotalsSeries,
  maxDailyScore,
  rollingAverage,
} from '../../lib/scoring';
import { useData } from '../../providers/DataProvider';

const CHART_DAYS = 30;
const RECENT_DAYS = 14;

export default function HistoryScreen() {
  const { questions, checkins, loading, reload } = useData();
  const date = today();
  const max = maxDailyScore(questions);

  // 36 days so the oldest chart point still has a full 7-day window behind it.
  const series = useMemo(
    () => dayTotalsSeries(checkins, questions, date, CHART_DAYS + 6),
    [checkins, questions, date],
  );
  const averages = useMemo(() => rollingAverage(series, 7), [series]);

  const chartPoints = useMemo<ChartPoint[]>(
    () =>
      series
        .slice(0, CHART_DAYS)
        .map((day, i) => ({
          date: day.date,
          total: day.answered > 0 ? day.total : null,
          average: averages[i],
        }))
        .reverse(), // chart plots oldest -> newest
    [series, averages],
  );

  const week = useMemo(() => compareWeeks(checkins, questions, date), [checkins, questions, date]);
  const recent = series.slice(0, RECENT_DAYS).filter((d) => d.answered > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.green} />
        }
      >
        <View style={styles.summary}>
          <View style={styles.summaryLabel}>
            <Text variant="small" color={colors.inkMuted}>
              Last 7 days
            </Text>
            <Text variant="small" color={colors.inkMuted}>
              7-day avg:
            </Text>
          </View>
          <View style={styles.summaryValue}>
            <Text variant="display" color={colors.green}>
              {week.current == null ? '–' : week.current.toFixed(1)}
            </Text>
            <Text variant="heading" color={colors.inkFaint} style={styles.summaryMax}>
              /{max}
            </Text>
          </View>
        </View>

        {week.delta != null && (
          <View style={styles.delta}>
            <Ionicons
              name={week.delta >= 0 ? 'arrow-up' : 'arrow-down'}
              size={13}
              color={week.delta >= 0 ? colors.green : '#C4342B'}
            />
            <Text variant="smallStrong" color={week.delta >= 0 ? colors.green : '#C4342B'}>
              {week.delta >= 0 ? '+' : ''}
              {week.delta.toFixed(1)}
            </Text>
            <Text variant="small" color={colors.inkMuted}>
              vs previous week
            </Text>
          </View>
        )}

        <View style={styles.chartBlock}>
          <EnergyChart points={chartPoints} max={max || 10} />
        </View>

        <Text variant="heading" style={styles.recentTitle}>
          Recent days
        </Text>

        {recent.length === 0 ? (
          <Card flat style={styles.empty}>
            <Text variant="body" color={colors.inkMuted} center>
              No check-ins yet. Score a category today and it will show up here.
            </Text>
          </Card>
        ) : (
          <View>
            {recent.map((day) => (
              <View key={day.date} style={styles.dayRow}>
                <View style={styles.dayText}>
                  <Text variant="bodyStrong">{formatShortDate(day.date)}</Text>
                  <Text variant="caption" color={colors.inkMuted} style={styles.breakdown}>
                    {breakdownLine(day, questions)}
                  </Text>
                </View>
                <View style={styles.dayScore}>
                  <Text variant="heading" color={totalColor(day.total, max)}>
                    {day.total}
                  </Text>
                  <Text variant="small" color={colors.inkFaint}>
                    /{max}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 },
  summaryLabel: { alignItems: 'flex-end' },
  summaryValue: { flexDirection: 'row', alignItems: 'baseline' },
  summaryMax: { marginLeft: 2 },
  delta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 },
  chartBlock: { marginTop: 28 },
  recentTitle: { marginTop: 28, marginBottom: 6 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  dayText: { flex: 1, paddingRight: 12 },
  breakdown: { marginTop: 3 },
  dayScore: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  empty: { marginTop: 12, backgroundColor: colors.surface, padding: 20 },
});
