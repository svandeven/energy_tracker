import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { colors, radii } from '../../theme';
import {
  addDays,
  formatDayLabel,
  isFuture,
  isToday,
  isValidLocalDate,
  today,
  type LocalDate,
} from '../../lib/dates';
import { scoresForDate } from '../../lib/scoring';
import { HISTORY_WINDOW_DAYS, useData } from '../../providers/DataProvider';

/** Options are shown best-first (2, 1, 0) exactly as in the mockup. */
const OPTION_ORDER = [2, 1, 0] as const;

/**
 * Falls back to today for anything missing, malformed, in the future, or older
 * than the loaded window — a bad `?date=` should never silently write to the
 * wrong day.
 */
function resolveDate(raw: string | undefined): LocalDate {
  if (!isValidLocalDate(raw)) return today();
  if (isFuture(raw)) return today();
  if (raw < addDays(today(), -HISTORY_WINDOW_DAYS)) return today();
  return raw;
}

export default function CheckInScreen() {
  const router = useRouter();
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const { questions, checkins, saveScore } = useData();

  const date = resolveDate(dateParam);
  const backfilling = !isToday(date);
  const question = questions.find((q) => q.id === id);

  const existingScore = useMemo(
    () => scoresForDate(checkins, date).get(id ?? '') ?? null,
    [checkins, date, id],
  );

  const [selected, setSelected] = useState<number | null>(existingScore);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!question) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader onBackground="surface" />
        <View style={styles.missing}>
          <Text variant="bodyStrong" center>
            That check-in isn&apos;t available any more.
          </Text>
          <Button
            label="Back to dashboard"
            variant="secondary"
            onPress={() => router.replace('/')}
            style={styles.missingButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const index = questions.findIndex((q) => q.id === question.id);

  const choose = (score: number) => {
    setSelected(score);
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const save = async () => {
    if (selected == null) {
      setError('Pick the option that best matches your day.');
      return;
    }
    setSaving(true);
    try {
      await saveScore(question.id, selected, date);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Walk to the next unanswered category for *this* day, then to its
      // summary — the same chain whether you're logging today or backfilling.
      const answered = scoresForDate(checkins, date);
      answered.set(question.id, selected);
      const next = questions.find((q) => !answered.has(q.id));
      // Object form rather than a template string: expo-router's typed routes
      // reject interpolated paths.
      const carry = backfilling ? { date } : {};
      if (next) {
        router.replace({ pathname: '/check-in/[id]', params: { id: next.id, ...carry } });
      } else {
        router.replace({ pathname: '/summary', params: carry });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader onBackground="surface" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {backfilling && (
          <View style={styles.backfillBanner}>
            <Ionicons name="calendar-outline" size={15} color={colors.onMint} />
            <Text variant="smallStrong" color={colors.onMint}>
              Logging {formatDayLabel(date)}
            </Text>
          </View>
        )}

        <Text variant="label">
          Category {index + 1} of {questions.length}
        </Text>
        <Text variant="title" style={styles.title}>
          {question.title}
        </Text>
        <Text variant="body" color={colors.inkMuted}>
          {backfilling
            ? `How was this on ${formatDayLabel(date).toLowerCase()}?`
            : 'Choose what best matches your day.'}
        </Text>

        <View style={styles.options}>
          {OPTION_ORDER.map((score) => {
            const active = selected === score;
            return (
              <Pressable
                key={score}
                onPress={() => choose(score)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.option,
                  active && styles.optionActive,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionScore}>
                  <Text variant="label" color={active ? colors.onMint : colors.inkMuted}>
                    {score}
                  </Text>
                </View>
                <Text
                  variant="body"
                  style={styles.optionLabel}
                  color={active ? colors.onMint : colors.ink}
                >
                  {question.score_labels[score] || `Score ${score}`}
                </Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.onMint} />
                ) : (
                  <View style={styles.optionRing} />
                )}
              </Pressable>
            );
          })}
        </View>

        {existingScore != null && (
          <Text variant="caption" color={colors.inkMuted} style={styles.existingNote}>
            Already logged as {existingScore}. Saving replaces it.
          </Text>
        )}

        {error && (
          <Text variant="small" color="#C4342B" style={styles.error}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Save" onPress={save} loading={saving} />
        <View style={styles.backRow}>
          <Text variant="small" color={colors.inkMuted}>
            Not ready?{' '}
          </Text>
          <Pressable onPress={() => router.replace(backfilling ? '/history' : '/')} hitSlop={8}>
            <Text variant="smallStrong" color={colors.teal}>
              {backfilling ? 'Back to history' : 'Back to dashboard'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  backfillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  title: { marginTop: 2, marginBottom: 4 },
  options: { marginTop: 20, gap: 14 },
  option: {
    minHeight: 92,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionActive: { backgroundColor: colors.mint, borderColor: colors.green },
  optionPressed: { opacity: 0.85 },
  optionScore: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { flex: 1 },
  optionRing: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
  },
  existingNote: { marginTop: 14 },
  error: { marginTop: 14 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  backRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  missing: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  missingButton: { marginTop: 4 },
});
