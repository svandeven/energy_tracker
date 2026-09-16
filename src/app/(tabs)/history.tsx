import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/AppHeader';
import { EnergyChart, type ChartPoint } from '../../components/EnergyChart';
import { Text } from '../../components/Text';
import { colors, radii, totalColor } from '../../theme';
import { formatDayLabel, today } from '../../lib/dates';
import {
  breakdownLine,
  compareWeeks,
  type DayTotal,
  dayTotalsSeries,
  maxDailyScore,
  rollingAverage,
  scoresForDate,
} from '../../lib/scoring';
import { HISTORY_WINDOW_DAYS, useData } from '../../providers/DataProvider';

const CHART_DAYS = 30;
/** Rows shown before "Show earlier days" expands to the full loaded window. */
const RECENT_DAYS = 14;

export default function HistoryScreen() {
  const router = useRouter();
  const { questions, checkins, loading, reload } = useData();
  const [expanded, setExpanded] = useState(false);

  const date = today();
  const max = maxDailyScore(questions);

  // 36 days so the oldest chart point still has a full 7-day window behind it.
  const series = useMemo(
    () => dayTotalsSeries(checkins, questions, date, HISTORY_WINDOW_DAYS),
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

  // Every day in the window, gaps included — a missing day is a row you can fill.
  const days = series.slice(0, expanded ? HISTORY_WINDOW_DAYS : RECENT_DAYS);
  const missingCount = series.filter((d) => d.answered === 0).length;

  /** Opens the first unanswered category for a day, or the first one to edit. */
  const openDay = (day: DayTotal) => {
    const answered = scoresForDate(checkins, day.date);
    const target = questions.find((q) => !answered.has(q.id)) ?? questions[0];
    if (!target) return;
    router.push({
      pathname: '/check-in/[id]',
      params: { id: target.id, date: day.date },
    });
  };

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

        <View style={styles.recentHeader}>
          <Text variant="heading">Recent days</Text>
          {missingCount > 0 && (
            <Text variant="caption" color={colors.inkMuted}>
              {missingCount} not logged
            </Text>
          )}
        </View>
        <Text variant="small" color={colors.inkMuted} style={styles.recentHint}>
          Tap any day to fill it in or change it.
        </Text>

        <View>
          {days.map((day) => {
            const logged = day.answered > 0;
            const partial = logged && day.answered < questions.length;
            return (
              <Pressable
                key={day.date}
                onPress={() => openDay(day)}
                accessibilityRole="button"
                accessibilityLabel={
                  logged
                    ? `${formatDayLabel(day.date)}, ${day.total} out of ${max}${
                        partial ? `, ${day.answered} of ${questions.length} logged` : ''
                      }`
                    : `${formatDayLabel(day.date)}, not logged. Tap to add.`
                }
                style={({ pressed }) => [styles.dayRow, pressed && styles.pressed]}
              >
                <View style={styles.dayText}>
                  <Text variant="bodyStrong" color={logged ? colors.ink : colors.inkMuted}>
                    {formatDayLabel(day.date)}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted} style={styles.breakdown}>
                    {logged ? breakdownLine(day, questions) : 'Not logged'}
                  </Text>
                </View>

                {logged ? (
                  <View style={styles.dayRight}>
                    {partial && (
                      <Text variant="caption" color={colors.inkFaint}>
                        {day.answered}/{questions.length}
                      </Text>
                    )}
                    <View style={styles.dayScore}>
                      <Text variant="heading" color={totalColor(day.total, max)}>
                        {day.total}
                      </Text>
                      <Text variant="small" color={colors.inkFaint}>
                        /{max}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.addChip}>
                    <Ionicons name="add" size={14} color={colors.green} />
                    <Text variant="caption" color={colors.green}>
                      Add
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {!expanded && series.length > RECENT_DAYS && (
          <Pressable
            onPress={() => setExpanded(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}
          >
            <Text variant="smallStrong" color={colors.teal} center>
              Show earlier days
            </Text>
          </Pressable>
        )}
        {expanded && (
          <Text variant="caption" color={colors.inkFaint} center style={styles.windowNote}>
            Showing the last {HISTORY_WINDOW_DAYS} days — the furthest back you can log.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  summaryLabel: { alignItems: 'flex-end' },
  summaryValue: { flexDirection: 'row', alignItems: 'baseline' },
  summaryMax: { marginLeft: 2 },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  chartBlock: { marginTop: 28 },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  recentHint: { marginTop: 2, marginBottom: 4 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  dayText: { flex: 1, paddingRight: 12 },
  breakdown: { marginTop: 3 },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayScore: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  showMore: { marginTop: 18, paddingVertical: 12 },
  windowNote: { marginTop: 18 },
  pressed: { opacity: 0.6 },
});
