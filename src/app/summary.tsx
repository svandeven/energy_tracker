import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CategoryIcon } from '../components/CategoryIcon';
import { Text } from '../components/Text';
import { colors, radii } from '../theme';
import {
  addDays,
  isFuture,
  isToday,
  isValidLocalDate,
  today,
  type LocalDate,
} from '../lib/dates';
import { dayTotal, isDue, maxDailyScore, summaryMessageKey } from '../lib/scoring';
import { HISTORY_WINDOW_DAYS, useData } from '../providers/DataProvider';
import { useI18n } from '../i18n';

/** Mirrors the check-in screen's guard so a bad `?date=` falls back to today. */
function resolveDate(raw: string | undefined): LocalDate {
  if (!isValidLocalDate(raw)) return today();
  if (isFuture(raw)) return today();
  if (raw < addDays(today(), -HISTORY_WINDOW_DAYS)) return today();
  return raw;
}

export default function SummaryScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { questions, checkins } = useData();
  const { t, fmt } = useI18n();

  const date = resolveDate(dateParam);
  const day = useMemo(() => dayTotal(checkins, questions, date), [checkins, questions, date]);
  const max = maxDailyScore(questions);
  const complete = day.answered === questions.length && questions.length > 0;
  const unanswered = questions.filter((q) => !day.scores.has(q.id));
  const toGo = unanswered.filter((q) => isDue(q, date)).length;
  // Next-day questions still waiting for tomorrow morning.
  const later = unanswered.length - toGo;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader onBackground="surface" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={30} color={complete ? colors.primary : colors.inkFaint} />
        </View>
        <Text variant="title" center>
          {isToday(date) ? t('summary.today') : t('summary.day')}
        </Text>
        <Text variant="small" color={colors.inkMuted} center style={styles.date}>
          {fmt.longDate(date)}
        </Text>

        <Card style={styles.card} padded={false}>
          {questions.map((question, i) => {
            const score = day.scores.get(question.id);
            return (
              <View
                key={question.id}
                style={[styles.row, i < questions.length - 1 && styles.rowDivider]}
              >
                <CategoryIcon icon={question.icon} size={34} muted={score == null} />
                <Text variant="body" style={styles.rowLabel}>
                  {question.title}
                </Text>
                <Text variant="bodyStrong" color={score == null ? colors.inkFaint : colors.ink}>
                  {score == null ? '–' : score}
                </Text>
              </View>
            );
          })}
        </Card>

        <View style={styles.totalCard}>
          <Text variant="small" color={colors.onTint} center>
            {t('summary.total')}
          </Text>
          <Text variant="display" color={colors.ink} style={styles.totalValue}>
            {day.total}/{max}
          </Text>
          <Text variant="small" color={colors.onTint} center>
            {complete
              ? t(summaryMessageKey(day.total, max))
              : isToday(date) && toGo > 0
                ? toGo === 1
                  ? t('summary.toGoOne')
                  : t('summary.toGoOther', { count: toGo })
                : isToday(date) && later > 0
                  ? later === 1
                    ? t('summary.laterOne')
                    : t('summary.laterOther', { count: later })
                  : t('summary.partial', { answered: day.answered, total: questions.length })}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label={t('summary.viewHistory')} onPress={() => router.replace('/history')} />
          <Button
            label={isToday(date) ? t('common.backToDashboard') : t('common.backToHistory')}
            variant="secondary"
            onPress={() => router.replace(isToday(date) ? '/' : '/history')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  badge: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  date: { marginTop: 4, marginBottom: 20 },
  card: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.surface },
  rowLabel: { flex: 1 },
  totalCard: {
    marginTop: 18,
    backgroundColor: colors.tint,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
  },
  totalValue: { marginVertical: 6 },
  actions: { marginTop: 20, gap: 12 },
});
