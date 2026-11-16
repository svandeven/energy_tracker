import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/AppHeader';
import { EnergyChart, type ChartPoint } from '../../components/EnergyChart';
import { Text } from '../../components/Text';
import { colors, radii, totalColor } from '../../theme';
import { today } from '../../lib/dates';
import { useI18n } from '../../i18n';
import { shortLabel } from '../../i18n/questions';
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
  const { t, fmt } = useI18n();
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
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        <View style={styles.summary}>
          <View style={styles.summaryLabel}>
            <Text variant="small" color={colors.inkMuted}>
              {t('history.last7')}
            </Text>
            <Text variant="small" color={colors.inkMuted}>
              {t('history.avg7')}
            </Text>
          </View>
          <View style={styles.summaryValue}>
            <Text variant="display" color={colors.primary}>
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
              color={week.delta >= 0 ? colors.accent : '#C4342B'}
            />
            <Text variant="smallStrong" color={week.delta >= 0 ? colors.accent : '#C4342B'}>
              {week.delta >= 0 ? '+' : ''}
              {week.delta.toFixed(1)}
            </Text>
            <Text variant="small" color={colors.inkMuted}>
              {t('history.vsPrevious')}
            </Text>
          </View>
        )}

        <View style={styles.chartBlock}>
          <EnergyChart points={chartPoints} max={max || 10} />
        </View>

        <View style={styles.recentHeader}>
          <Text variant="heading">{t('history.recent')}</Text>
          {missingCount > 0 && (
            <Text variant="caption" color={colors.inkMuted}>
              {t('history.notLoggedCount', { count: missingCount })}
            </Text>
          )}
        </View>
        <Text variant="small" color={colors.inkMuted} style={styles.recentHint}>
          {t('history.tapHint')}
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
                  !logged
                    ? t('history.a11yNotLogged', { day: fmt.dayLabel(day.date) })
                    : partial
                      ? t('history.a11yPartial', {
                          day: fmt.dayLabel(day.date),
                          total: day.total,
                          max,
                          answered: day.answered,
                          count: questions.length,
                        })
                      : t('history.a11yLogged', { day: fmt.dayLabel(day.date), total: day.total, max })
                }
                style={({ pressed }) => [styles.dayRow, pressed && styles.pressed]}
              >
                <View style={styles.dayText}>
                  <Text variant="bodyStrong" color={logged ? colors.ink : colors.inkMuted}>
                    {fmt.dayLabel(day.date)}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted} style={styles.breakdown}>
                    {logged
                      ? breakdownLine(day, questions, (q) => shortLabel(q, t))
                      : t('history.notLogged')}
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
                    <Ionicons name="add" size={14} color={colors.accent} />
                    <Text variant="caption" color={colors.accent}>
                      {t('history.add')}
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
            <Text variant="smallStrong" color={colors.accent} center>
              {t('history.showEarlier')}
            </Text>
          </Pressable>
        )}
        {expanded && (
          <Text variant="caption" color={colors.inkFaint} center style={styles.windowNote}>
            {t('history.windowNote', { days: HISTORY_WINDOW_DAYS })}
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
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  showMore: { marginTop: 18, paddingVertical: 12 },
  windowNote: { marginTop: 18 },
  pressed: { opacity: 0.6 },
});
