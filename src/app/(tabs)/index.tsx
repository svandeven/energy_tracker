import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Text } from '../../components/Text';
import { colors, radii, scoreColor } from '../../theme';
import { formatShortDate, greeting, today } from '../../lib/dates';
import { dayTotal, maxDailyScore } from '../../lib/scoring';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { questions, checkins, loading, error, reload } = useData();

  const date = today();
  const day = useMemo(
    () => dayTotal(checkins, questions, date),
    [checkins, questions, date],
  );
  const max = maxDailyScore(questions);
  const remaining = questions.length - day.answered;
  const complete = remaining === 0 && questions.length > 0;

  if (loading && questions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.green} />
        </View>
      </SafeAreaView>
    );
  }

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
        <Text variant="label" color={colors.inkFaint}>
          {formatShortDate(date)}
        </Text>
        <Text variant="title" style={styles.greeting}>
          {greeting()}
          {profile?.display_name ? `, ${capitalize(profile.display_name)}` : ''}
        </Text>

        {error && (
          <Text variant="small" color="#C4342B" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.totalCard}>
          <View>
            <Text variant="small" color={colors.onMint}>
              Today&apos;s total
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

        <Text variant="heading" style={styles.sectionTitle}>
          Energy Check-ins
        </Text>

        <View style={styles.list}>
          {questions.map((question) => {
            const score = day.scores.get(question.id) ?? null;
            const scored = score != null;
            return (
              <Pressable
                key={question.id}
                onPress={() => router.push(`/check-in/${question.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${question.title}, ${
                  scored ? `scored ${score} out of 2` : 'not scored yet'
                }`}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Card style={styles.row} padded={false}>
                  <View style={styles.rowInner}>
                    <CategoryIcon icon={question.icon} muted={!scored} />
                    <View style={styles.rowText}>
                      <Text variant="bodyStrong">{question.title}</Text>
                      <Text variant="small" color={colors.inkMuted}>
                        {scored ? 'Completed' : 'Not scored yet'}
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
          <View style={[styles.promptBadge, !complete && styles.promptBadgeIdle]}>
            <Ionicons name="checkmark" size={22} color={colors.white} />
          </View>
          <Text variant="heading" center style={styles.promptTitle}>
            {complete ? 'All done!' : remaining === questions.length ? 'Ready when you are' : 'Almost there!'}
          </Text>
          <Text variant="small" color={colors.inkMuted} center>
            {complete
              ? "Every check-in is in. Here's how the day added up."
              : `Finish your last ${remaining} check-in${remaining === 1 ? '' : 's'} to complete today.`}
          </Text>
          <Button
            label="View today's summary"
            variant="dark"
            onPress={() => router.push('/summary')}
            style={styles.promptButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  greeting: { marginTop: 2 },
  error: { marginTop: 8 },
  totalCard: {
    marginTop: 18,
    backgroundColor: colors.mint,
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
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginTop: 24, marginBottom: 12 },
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
  },
  promptBadge: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptBadgeIdle: { backgroundColor: colors.inkFaint },
  promptTitle: { marginTop: 12, marginBottom: 4 },
  promptButton: { alignSelf: 'stretch', marginTop: 16 },
});
