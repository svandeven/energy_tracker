import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenTop } from '../components/ScreenTop';
import { Text } from '../components/Text';
import { TimePicker } from '../components/TimePicker';
import { cardShadow, colors, radii } from '../theme';
import type { GoalRow, GoalTemplateRow } from '../lib/database.types';
import { isRepeating } from '../lib/goals';
import { useI18n } from '../i18n';
import { useAuth } from '../providers/AuthProvider';
import { useGoals } from '../providers/GoalsProvider';

const DEFAULT_REMINDER = '12:00:00';

type Editing =
  | { kind: 'plan' | 'review'; value: string }
  | { kind: 'template'; template: GoalTemplateRow; value: string }
  | { kind: 'goal'; goal: GoalRow; value: string };

/** The morning planning and evening review nudges, plus each goal's reminder. */
export default function RemindersScreen() {
  const router = useRouter();
  const { t, fmt } = useI18n();
  const { profile, setGoalTimes } = useAuth();
  const { templates, todaysGoals, setReminder, setTemplateReminder } = useGoals();
  const [editing, setEditing] = useState<Editing | null>(null);

  const planTime = profile?.goal_plan_time ?? '07:30:00';
  const reviewTime = profile?.goal_review_time ?? '20:30:00';
  const pushOn = profile?.push_enabled ?? false;

  const repeating = templates.filter((tpl) => isRepeating(tpl));
  const oneOff = todaysGoals.filter(
    (g) => !isRepeating(templates.find((tpl) => tpl.id === g.template_id)),
  );

  const apply = (next: string) => {
    if (!editing) return;
    if (editing.kind === 'plan') void setGoalTimes({ goal_plan_time: next });
    else if (editing.kind === 'review') void setGoalTimes({ goal_review_time: next });
    else if (editing.kind === 'template') void setTemplateReminder(editing.template, next);
    else if (editing.kind === 'goal') void setReminder(editing.goal, next);
    setEditing({ ...editing, value: next });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTop back title={t('reminders.title')} subtitle={t('reminders.subtitle')} />

        {Platform.OS === 'web' ? (
          <View style={styles.note}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.onTint} />
            <Text variant="small" color={colors.onTint} style={styles.flex}>
              {t('reminders.webNote')}
            </Text>
          </View>
        ) : (
          !pushOn && (
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.note, pressed && styles.pressed]}
            >
              <Ionicons name="notifications-off-outline" size={18} color={colors.onTint} />
              <View style={styles.flex}>
                <Text variant="small" color={colors.onTint}>
                  {t('reminders.pushOff')}
                </Text>
                <Text variant="smallStrong" color={colors.accent}>
                  {t('reminders.openSettings')}
                </Text>
              </View>
            </Pressable>
          )
        )}

        <NudgeRow
          icon="sunny"
          iconBg={colors.yellow}
          title={t('reminders.plan')}
          time={fmt.time(planTime)}
          onPress={() => setEditing({ kind: 'plan', value: planTime })}
        />
        <NudgeRow
          icon="moon"
          iconBg={colors.done}
          iconColor={colors.white}
          title={t('reminders.review')}
          time={fmt.time(reviewTime)}
          onPress={() => setEditing({ kind: 'review', value: reviewTime })}
        />

        <Text variant="bodyStrong" style={styles.section}>
          {t('reminders.goalSection')}
        </Text>

        {repeating.length + oneOff.length === 0 && (
          <Text variant="small" color={colors.inkMuted}>
            {t('reminders.noGoals')}
          </Text>
        )}

        <View style={styles.list}>
          {repeating.map((tpl) => (
            <GoalReminderRow
              key={tpl.id}
              title={tpl.title}
              detail={tpl.repeat === 'weekdays' ? t('reminders.weekdays') : t('reminders.everyDay')}
              time={tpl.remind_at}
              onToggle={(on) => {
                if (on) setEditing({ kind: 'template', template: tpl, value: DEFAULT_REMINDER });
                void setTemplateReminder(tpl, on ? DEFAULT_REMINDER : null);
              }}
              onEditTime={() =>
                setEditing({
                  kind: 'template',
                  template: tpl,
                  value: tpl.remind_at ?? DEFAULT_REMINDER,
                })
              }
            />
          ))}
          {oneOff.map((goal) => (
            <GoalReminderRow
              key={goal.id}
              title={goal.title}
              detail={t('reminders.today')}
              time={goal.remind_at}
              onToggle={(on) => {
                if (on) setEditing({ kind: 'goal', goal, value: DEFAULT_REMINDER });
                void setReminder(goal, on ? DEFAULT_REMINDER : null);
              }}
              onEditTime={() =>
                setEditing({ kind: 'goal', goal, value: goal.remind_at ?? DEFAULT_REMINDER })
              }
            />
          ))}
        </View>

        <View style={[styles.note, styles.tip]}>
          <Ionicons name="watch-outline" size={18} color={colors.onTint} />
          <Text variant="small" color={colors.onTint} style={styles.flex}>
            {t('reminders.watchTip')}
          </Text>
        </View>
      </ScrollView>

      {editing && (
        <TimePicker value={editing.value} onChange={apply} onDismiss={() => setEditing(null)} />
      )}
    </SafeAreaView>
  );
}

function NudgeRow(props: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  iconColor?: string;
  title: string;
  time: string;
  onPress(): void;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={t('reminders.changeTimeA11y', { title: props.title })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: props.iconBg }]}>
        <Ionicons name={props.icon} size={18} color={props.iconColor ?? colors.ink} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{props.title}</Text>
        <Text variant="caption" color={colors.inkMuted}>
          {t('reminders.everyDay')}
        </Text>
      </View>
      <Text variant="bodyStrong" color={colors.primary}>
        {props.time}
      </Text>
    </Pressable>
  );
}

function GoalReminderRow(props: {
  title: string;
  detail: string;
  time: string | null;
  onToggle(on: boolean): void;
  onEditTime(): void;
}) {
  const { t, fmt } = useI18n();
  return (
    <View style={styles.card}>
      <Pressable
        onPress={props.time ? props.onEditTime : undefined}
        disabled={!props.time}
        accessibilityRole="button"
        accessibilityLabel={t('reminders.changeTimeA11y', { title: props.title })}
        style={styles.flex}
      >
        <Text variant="bodyStrong">{props.title}</Text>
        <Text variant="caption" color={props.time ? colors.primary : colors.inkMuted}>
          {props.time ? `${fmt.time(props.time)} · ${props.detail}` : props.detail}
        </Text>
      </Pressable>
      <Switch
        value={props.time != null}
        onValueChange={props.onToggle}
        accessibilityLabel={t('reminders.toggleA11y', { title: props.title })}
        trackColor={{ false: colors.border, true: colors.done }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    ...cardShadow,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 16, marginBottom: 10 },
  list: {},
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.tint,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 14,
  },
  tip: { marginTop: 10 },
  pressed: { opacity: 0.7 },
});
