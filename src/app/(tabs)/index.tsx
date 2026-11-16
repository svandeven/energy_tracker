import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { CheckCircle } from '../../components/CheckCircle';
import { GoalItem } from '../../components/GoalItem';
import { HeroCard } from '../../components/HeroCard';
import { ScreenTop } from '../../components/ScreenTop';
import { SectionHeader } from '../../components/SectionHeader';
import { Text } from '../../components/Text';
import { cardShadow, colors, radii } from '../../theme';
import { today } from '../../lib/dates';
import { dayTotal, isDue } from '../../lib/scoring';
import { type TranslationKey, useI18n } from '../../i18n';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';
import { useGoals } from '../../providers/GoalsProvider';

/** Goals shown on Home before "See all". */
const HOME_GOALS = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { questions, checkins, loading, error, reload } = useData();
  const goals = useGoals();
  const { t, fmt } = useI18n();

  const date = today();
  const day = useMemo(() => dayTotal(checkins, questions, date), [checkins, questions, date]);
  const answered = day.scores.size;

  const energyValue =
    answered === 0
      ? t('home.energyNone')
      : t('home.energyValue', {
          level: t(energyLevel(day.total, answered * 2)),
          answered,
          total: questions.length,
        });

  const greeting = t(greetingKey());
  const title = profile?.display_name
    ? t('dashboard.greetingWithName', { greeting, name: capitalize(profile.display_name) })
    : greeting;

  const shownGoals = goals.todaysGoals.slice(0, HOME_GOALS);
  const goalsDone = goals.todaysGoals.filter((g) => g.done_at).length;

  const refresh = () => {
    void reload();
    void goals.reload();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading || goals.loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <ScreenTop
          caption={fmt.shortDate(date)}
          title={title}
          action={{
            icon: 'person',
            avatar: { url: profile?.avatar_url ?? null, name: profile?.display_name ?? null },
            label: t('home.profileA11y'),
            onPress: () => router.push('/settings'),
          }}
        />

        {(error || goals.error) && (
          <Text variant="small" color="#C4342B" style={styles.error}>
            {error ?? goals.error}
          </Text>
        )}

        <HeroCard
          label={t('home.energyLabel')}
          value={energyValue}
          icon="sunny"
          onPress={() => router.push('/checkin')}
        />

        <SectionHeader
          title={t('home.dailyQuestions')}
          aside={t('home.count', { done: answered, total: questions.length })}
        />
        <View style={styles.list}>
          {questions.map((question) => {
            const score = day.scores.get(question.id);
            const scored = score != null;
            const subtitle = scored
              ? question.score_labels[score]
              : isDue(question, date)
                ? t('home.questionPrompt')
                : t('dashboard.logTomorrow');
            return (
              <Pressable
                key={question.id}
                onPress={() => router.push(`/check-in/${question.id}`)}
                accessibilityRole="button"
                accessibilityLabel={
                  scored
                    ? t('dashboard.a11yScored', { title: question.title, score })
                    : t('dashboard.a11yNotScored', { title: question.title })
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <CheckCircle checked={scored} />
                <View style={styles.rowText}>
                  <Text variant="bodyStrong">{question.title}</Text>
                  <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>
                {!scored && <Ionicons name="chevron-forward" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={t('home.dailyGoals')}
            aside={goals.todaysGoals.length > 0 ? t('home.seeAll') : undefined}
            onAsidePress={() => router.push('/goals')}
          />
          {goals.todaysGoals.length === 0 ? (
            <Text variant="small" color={colors.inkMuted} style={styles.empty}>
              {t('home.noGoals')}
            </Text>
          ) : (
            <View style={styles.list}>
              {shownGoals.map((goal) => (
                <GoalItem key={goal.id} goal={goal} onToggle={() => void goals.toggleDone(goal)} />
              ))}
            </View>
          )}
          {goals.todaysGoals.length > HOME_GOALS && (
            <Text variant="caption" color={colors.inkMuted} style={styles.more}>
              {t('home.count', { done: goalsDone, total: goals.todaysGoals.length })}
            </Text>
          )}
        </View>

        <Button
          label={`+  ${t('goals.add')}`}
          variant="dark"
          onPress={() => router.push('/goal/new')}
          style={styles.addButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function greetingKey(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'dashboard.goodMorning' as const;
  if (h < 18) return 'dashboard.goodAfternoon' as const;
  return 'dashboard.goodEvening' as const;
}

/** A word for how today's answers are going so far. */
function energyLevel(total: number, max: number): TranslationKey {
  const ratio = max > 0 ? total / max : 0;
  if (ratio >= 0.85) return 'home.levelBright';
  if (ratio >= 0.6) return 'home.levelRising';
  if (ratio >= 0.35) return 'home.levelSteady';
  return 'home.levelLow';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  error: { marginBottom: 12 },
  section: { marginTop: 24 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...cardShadow,
  },
  rowText: { flex: 1 },
  empty: { marginBottom: 4 },
  more: { marginTop: 8, textAlign: 'right' },
  pressed: { opacity: 0.7 },
  addButton: { marginTop: 22 },
});
