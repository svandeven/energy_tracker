import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { ScreenTop } from '../../components/ScreenTop';
import { Card } from '../../components/Card';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Text } from '../../components/Text';
import { colors, radii, scoreColor } from '../../theme';
import { addDays, today } from '../../lib/dates';
import { useI18n } from '../../i18n';
import { dayTotal, isDue, maxDailyScore, scoresForDate } from '../../lib/scoring';
import { useData } from '../../providers/DataProvider';

/** The energy check-in list: today's questions, total and summary prompt. */
export default function CheckInScreen() {
  const router = useRouter();
  const { questions, checkins, loading, error, reload } = useData();
  const { t, fmt } = useI18n();

  const date = today();
  const day = useMemo(
    () => dayTotal(checkins, questions, date),
    [checkins, questions, date],
  );
  const max = maxDailyScore(questions);
  // Next-day questions aren't due until tomorrow morning, so "done" means done
  // with everything due today; answering them now is optional.
  const answerableToday = questions.filter((q) => isDue(q, date));
  const remaining = answerableToday.filter((q) => !day.scores.has(q.id)).length;
  const later = questions.filter((q) => !isDue(q, date) && !day.scores.has(q.id)).length;
  const complete = remaining === 0 && later === 0 && questions.length > 0;
  const doneForNow = remaining === 0 && later > 0;

  // Yesterday's next-day questions, which become answerable this morning.
  const yesterday = addDays(date, -1);
  const yesterdayScores = useMemo(() => scoresForDate(checkins, yesterday), [checkins, yesterday]);
  const pendingYesterday = questions.filter(
    (q) => q.reminder_next_day && !yesterdayScores.has(q.id),
  );

  if (loading && questions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        <ScreenTop caption={fmt.shortDate(date)} title={t('dashboard.title')} />

        {error && (
          <Text variant="small" color="#C4342B" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.totalCard}>
          <View>
            <Text variant="small" color={colors.onTint}>
              {t('dashboard.todaysTotal')}
            </Text>
            <View style={styles.totalRow}>
              <Text variant="display" color={colors.ink}>
                {day.total}
              </Text>
              <Text variant="bodyStrong" color={colors.inkMuted} style={styles.totalMax}>
                /{max}
              </Text>
            </View>
          </View>
          <View style={styles.totalBadge}>
            <Ionicons name="flash" size={20} color={colors.white} />
          </View>
        </View>

        {pendingYesterday.length > 0 && (
          <View style={styles.yesterdayCard}>
            <Text variant="bodyStrong" color={colors.onTint}>
              {t('dashboard.finishYesterday')}
            </Text>
            <Text variant="small" color={colors.onTint}>
              {t('dashboard.finishYesterdayBody')}
            </Text>
            {pendingYesterday.map((question) => (
              <Pressable
                key={question.id}
                onPress={() =>
                  router.push({
                    pathname: '/check-in/[id]',
                    params: { id: question.id, date: yesterday },
                  })
                }
                accessibilityRole="button"
                style={({ pressed }) => [styles.yesterdayRow, pressed && styles.pressed]}
              >
                <CategoryIcon icon={question.icon} size={34} />
                <Text variant="bodyStrong" style={styles.rowText}>
                  {question.title}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </Pressable>
            ))}
          </View>
        )}

        <Text variant="heading" style={styles.sectionTitle}>
          {t('dashboard.checkins')}
        </Text>

        <View style={styles.list}>
          {questions.map((question) => {
            const score = day.scores.get(question.id) ?? null;
            const scored = score != null;
            const optional = !scored && !isDue(question, date);
            return (
              <Pressable
                key={question.id}
                onPress={() => router.push(`/check-in/${question.id}`)}
                accessibilityRole="button"
                accessibilityLabel={
                  scored
                    ? t('dashboard.a11yScored', { title: question.title, score })
                    : optional
                      ? `${question.title}, ${t('dashboard.logTomorrow')}`
                      : t('dashboard.a11yNotScored', { title: question.title })
                }
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Card style={styles.row} padded={false}>
                  <View style={styles.rowInner}>
                    <CategoryIcon icon={question.icon} muted={!scored} />
                    <View style={styles.rowText}>
                      <Text variant="bodyStrong">{question.title}</Text>
                      <Text variant="small" color={colors.inkMuted}>
                        {scored
                          ? t('dashboard.completed')
                          : optional
                            ? t('dashboard.logTomorrow')
                            : t('dashboard.notScored')}
                      </Text>
                    </View>
                    {scored ? (
                      <View style={styles.scoreRow}>
                        <Text variant="heading" color={scoreColor(score)}>
                          {score}
                        </Text>
                        <Text variant="small" color={colors.inkFaint}>
                          /2
                        </Text>
                      </View>
                    ) : optional ? (
                      <Ionicons name="moon-outline" size={20} color={colors.inkFaint} />
                    ) : (
                      <View style={styles.pendingRing} />
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.promptCard}>
          <View style={[styles.promptBadge, !complete && !doneForNow && styles.promptBadgeIdle]}>
            <Ionicons name="checkmark" size={22} color={colors.white} />
          </View>
          <Text variant="heading" center style={styles.promptTitle}>
            {complete
              ? t('dashboard.allDone')
              : doneForNow
                ? t('dashboard.allDoneForNow')
                : remaining === answerableToday.length
                  ? t('dashboard.ready')
                  : t('dashboard.almost')}
          </Text>
          <Text variant="small" color={colors.inkMuted} center>
            {complete
              ? t('dashboard.allDoneBody')
              : doneForNow
                ? later === 1
                  ? t('dashboard.laterOne')
                  : t('dashboard.laterOther', { count: later })
                : remaining === 1
                ? t('dashboard.remainingOne')
                : t('dashboard.remainingOther', { count: remaining })}
          </Text>
          <Button
            label={t('dashboard.viewSummary')}
            variant="dark"
            onPress={() => router.push('/summary')}
            style={styles.promptButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  error: { marginTop: 8 },
  totalCard: {
    backgroundColor: colors.tint,
    borderRadius: radii.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  totalMax: { marginLeft: 4 },
  totalBadge: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginTop: 24, marginBottom: 12 },
  yesterdayCard: {
    marginTop: 16,
    backgroundColor: colors.tint,
    borderRadius: radii.lg,
    padding: 16,
    gap: 4,
  },
  yesterdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 10,
  },
  list: { gap: 10 },
  row: { borderWidth: 1, borderColor: colors.border },
  rowInner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  rowText: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  pendingRing: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  pressed: { opacity: 0.7 },
  promptCard: {
    marginTop: 22,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
  },
  promptBadge: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptBadgeIdle: { backgroundColor: colors.inkFaint },
  promptTitle: { marginTop: 12, marginBottom: 4 },
  promptButton: { alignSelf: 'stretch', marginTop: 16 },
});
