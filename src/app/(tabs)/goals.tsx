import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../components/Button';
import { GoalItem } from '../../components/GoalItem';
import { HeroCard } from '../../components/HeroCard';
import { ScreenTop } from '../../components/ScreenTop';
import { Text } from '../../components/Text';
import { TimePicker } from '../../components/TimePicker';
import { colors, radii } from '../../theme';
import type { GoalRow, GoalTemplateRow } from '../../lib/database.types';
import { isRepeating } from '../../lib/goals';
import { type TranslationKey, useI18n } from '../../i18n';
import { useGoals } from '../../providers/GoalsProvider';

const DEFAULT_REMINDER = '12:00:00';

export default function GoalsScreen() {
  const router = useRouter();
  const {
    date,
    todaysGoals,
    templates,
    loading,
    error,
    reload,
    toggleDone,
    removeGoal,
    setReminder,
  } = useGoals();
  const { t, fmt } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const [timeFor, setTimeFor] = useState<GoalRow | null>(null);

  const done = todaysGoals.filter((g) => g.done_at).length;
  const total = todaysGoals.length;
  const templateOf = (goal: GoalRow) => templates.find((tpl) => tpl.id === goal.template_id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
        }
      >
        <ScreenTop
          caption={fmt.shortDate(date)}
          title={t('goals.title')}
          action={{
            icon: 'notifications-outline',
            label: t('goals.remindersA11y'),
            onPress: () => router.push('/reminders'),
          }}
        />

        {error && (
          <Text variant="small" color="#C4342B" style={styles.error}>
            {error}
          </Text>
        )}

        <HeroCard
          label={t('goals.heroLabel')}
          value={total === 0 ? t('goals.heroEmpty') : t('goals.heroValue', { done, total })}
          icon="sunny"
          progress={total === 0 ? 0 : done / total}
        />

        {total === 0 && (
          <Text variant="small" color={colors.inkMuted} style={styles.empty}>
            {t('goals.empty')}
          </Text>
        )}

        <View style={styles.list}>
          {todaysGoals.map((goal) => {
            const template = templateOf(goal);
            const open = openId === goal.id;
            return (
              <GoalItem
                key={goal.id}
                goal={goal}
                subtitle={t(subtitleKey(template))}
                onToggle={() => void toggleDone(goal)}
                onPress={() => setOpenId(open ? null : goal.id)}
              >
                {open && (
                  <View style={styles.options}>
                    <Option
                      label={
                        goal.remind_at
                          ? t('goals.reminderAt', { time: fmt.time(goal.remind_at) })
                          : t('goals.addReminder')
                      }
                      onPress={() => setTimeFor(goal)}
                    />
                    {goal.remind_at && (
                      <Option
                        label={t('goals.noReminder')}
                        onPress={() => void setReminder(goal, null)}
                      />
                    )}
                    <Option
                      label={t('goals.removeToday')}
                      onPress={() => void removeGoal(goal, 'today')}
                    />
                    {isRepeating(template) && (
                      <Option
                        label={t('goals.stopRepeating')}
                        onPress={() => void removeGoal(goal, 'always')}
                      />
                    )}
                  </View>
                )}
              </GoalItem>
            );
          })}
        </View>

        <Button
          label={`+  ${t('goals.add')}`}
          variant="dark"
          onPress={() => router.push('/goal/new')}
          style={styles.addButton}
        />
      </ScrollView>

      {timeFor && (
        <TimePicker
          value={timeFor.remind_at ?? DEFAULT_REMINDER}
          onChange={(next) => {
            void setReminder(timeFor, next);
            setTimeFor((g) => (g ? { ...g, remind_at: next } : g));
          }}
          onDismiss={() => setTimeFor(null)}
        />
      )}
    </SafeAreaView>
  );
}

function subtitleKey(template: GoalTemplateRow | undefined): TranslationKey {
  if (!template) return 'goals.addedToday';
  if (template.repeat === 'daily') return 'goals.defaultGoal';
  if (template.repeat === 'weekdays') return 'goals.weekdayGoal';
  return 'goals.savedGoal';
}

function Option({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text variant="caption" color={colors.onTint}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  error: { marginBottom: 12 },
  empty: { marginBottom: 12 },
  list: { gap: 10 },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingLeft: 50,
  },
  option: {
    backgroundColor: colors.tint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pressed: { opacity: 0.7 },
  addButton: { marginTop: 22 },
});
