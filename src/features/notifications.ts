import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { CheckinRow, GoalRow, GoalTemplateRow, QuestionRow } from '../lib/database.types';
import { type LocalDate, addDays, parseLocalDate, parseTime } from '../lib/dates';
import { appliesOn, isRepeating } from '../lib/goals';
import type { GoalNotificationData } from './goalsApi';

/** Identifies our reminders so we never cancel someone else's notifications. */
const CHANNEL_ID = 'energy-checkins';

/** Notification category whose reminders carry a "Done" button. */
export const GOAL_CATEGORY = 'goal';
export const GOAL_DONE_ACTION = 'done';

/**
 * Each question gets its own category, because its score buttons carry that
 * question's own labels. Buttons go best-first, as on the check-in screen.
 */
const questionCategory = (questionId: string) => `question-${questionId}`;
const SCORE_ORDER = [2, 1, 0] as const;
const SCORE_ACTION_PREFIX = 'score-';

/** The score a reminder's button stands for, or null for any other tap. */
export function scoreFromAction(actionIdentifier: string): number | null {
  if (!actionIdentifier.startsWith(SCORE_ACTION_PREFIX)) return null;
  const score = Number(actionIdentifier.slice(SCORE_ACTION_PREFIX.length));
  return (SCORE_ORDER as readonly number[]).includes(score) ? score : null;
}

/**
 * Question and repeating goal reminders are scheduled one day at a time for
 * this many days ahead (re-planned whenever the app opens), so a question
 * already answered or a goal already ticked off doesn't still nag.
 */
const DAYS_AHEAD = 7;
/** iOS keeps at most 64 pending notifications; the nearest ones win. */
const MAX_PENDING = 64;

/**
 * expo-notifications has no scheduling implementation on web — calling
 * `cancelAllScheduledNotificationsAsync` or `scheduleNotificationAsync` there
 * throws outright. Everything below no-ops instead so the web smoke build and
 * any future browser target keep working.
 */
const SUPPORTED = Platform.OS !== 'web';

if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  // Simulators can't receive notifications, so don't prompt there either.
  if (!Device.isDevice) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Reminder wording in the user's language; the titles come from the questions and goals. */
export interface ReminderText {
  body: string;
  /** For next-day questions, which ask about the day before. */
  bodyNextDay: string;
  channelName: string;
  goalPlanTitle: string;
  goalPlanBody: string;
  goalReviewTitle: string;
  goalReviewBody: string;
  goalBody: string;
  doneAction: string;
  /** Button title for a score whose label the user left empty. */
  scoreFallback(score: number): string;
}

export interface ReminderPlan {
  enabled: boolean;
  questions: QuestionRow[];
  /** Recent check-ins, to skip question reminders for days already answered. */
  checkins: CheckinRow[];
  /** 'HH:MM:SS' from the profile. */
  goalPlanTime: string | null;
  goalReviewTime: string | null;
  templates: GoalTemplateRow[];
  /** Today's goals, to skip reminders for ones already done or removed. */
  todaysGoals: GoalRow[];
  today: LocalDate;
  text: ReminderText;
}

async function ensureAndroidChannel(name: string) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
  });
}

const channel = () => (Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {});

function at(date: LocalDate, time: string): Date {
  const { hour, minute } = parseTime(time);
  const d = parseLocalDate(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

interface DatedReminder {
  when: Date;
  title: string;
  body: string;
  data: Record<string, unknown>;
  categoryIdentifier?: string;
}

/**
 * One reminder per question per day, for today and the next few days. A
 * next-day question's reminder asks about the day before, so answering it on
 * the day itself cancels the next morning's reminder.
 */
function questionReminders(plan: ReminderPlan): DatedReminder[] {
  const answered = new Set(plan.checkins.map((c) => `${c.question_id}@${c.local_date}`));
  const out: DatedReminder[] = [];
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const day = addDays(plan.today, offset);
    for (const question of plan.questions) {
      const date = question.reminder_next_day ? addDays(day, -1) : day;
      if (answered.has(`${question.id}@${date}`)) continue;
      out.push({
        when: at(day, question.reminder_time),
        title: question.title,
        body: question.reminder_next_day ? plan.text.bodyNextDay : plan.text.body,
        data: { kind: 'question', questionId: question.id, date },
        categoryIdentifier: questionCategory(question.id),
      });
    }
  }
  return out;
}

/** One reminder per goal per day, for today and the next few days. */
function goalReminders(plan: ReminderPlan): DatedReminder[] {
  const out: { when: Date; title: string; data: GoalNotificationData }[] = [];

  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const date = addDays(plan.today, offset);
    for (const template of plan.templates) {
      if (!template.remind_at || !isRepeating(template) || !appliesOn(template, date)) continue;
      if (offset === 0) {
        const goal = plan.todaysGoals.find((g) => g.template_id === template.id);
        // Ticked off or removed for today: nothing to remind about.
        if (!goal || goal.done_at || goal.hidden) continue;
      }
      out.push({
        when: at(date, template.remind_at),
        title: template.title,
        data: { kind: 'goal', date, templateId: template.id },
      });
    }
  }
  // Goals added just for today (or picked from the saved list).
  for (const goal of plan.todaysGoals) {
    const template = plan.templates.find((t) => t.id === goal.template_id);
    if (!goal.remind_at || goal.done_at || goal.hidden || isRepeating(template)) continue;
    out.push({
      when: at(plan.today, goal.remind_at),
      title: goal.title,
      data: { kind: 'goal', date: plan.today, goalId: goal.id },
    });
  }
  return out.map((r) => ({
    ...r,
    body: plan.text.goalBody,
    data: { ...r.data },
    categoryIdentifier: GOAL_CATEGORY,
  }));
}

/**
 * Replaces all scheduled reminders: one per unanswered question per day, the
 * morning "set your goals" and evening "what did you get done" nudges, and a
 * reminder with a Done button for each goal that has a time. Called whenever
 * any of those change — cheaper and less error-prone than diffing against
 * what's already scheduled.
 */
export async function syncReminders(plan: ReminderPlan) {
  if (!SUPPORTED) return;
  const { text } = plan;

  const wanted =
    plan.questions.length > 0 ||
    plan.goalPlanTime != null ||
    plan.goalReviewTime != null ||
    plan.templates.some((t) => t.remind_at) ||
    plan.todaysGoals.some((g) => g.remind_at);
  const granted = plan.enabled && wanted ? await requestPermission() : false;

  // Clear first so turning the toggle off (or losing permission) really stops
  // the reminders, then re-add only if we're allowed to.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!granted) return;

  await ensureAndroidChannel(text.channelName);
  await Notifications.setNotificationCategoryAsync(GOAL_CATEGORY, [
    {
      identifier: GOAL_DONE_ACTION,
      buttonTitle: text.doneAction,
      // iOS only hands the tap to JavaScript if the app opens (or is still in
      // memory); Android runs it in the background (see notificationActionTask).
      options: { opensAppToForeground: Platform.OS === 'ios' },
    },
  ]);
  for (const question of plan.questions) {
    await Notifications.setNotificationCategoryAsync(
      questionCategory(question.id),
      SCORE_ORDER.map((score) => ({
        identifier: `${SCORE_ACTION_PREFIX}${score}`,
        buttonTitle: question.score_labels[score] || text.scoreFallback(score),
        // Same split as the Done button above.
        options: { opensAppToForeground: Platform.OS === 'ios' },
      })),
    );
  }

  const daily = [
    { time: plan.goalPlanTime, title: text.goalPlanTitle, body: text.goalPlanBody, kind: 'goalPlan' },
    { time: plan.goalReviewTime, title: text.goalReviewTitle, body: text.goalReviewBody, kind: 'goalReview' },
  ];
  for (const nudge of daily) {
    if (!nudge.time) continue;
    const { hour, minute } = parseTime(nudge.time);
    await Notifications.scheduleNotificationAsync({
      content: { title: nudge.title, body: nudge.body, data: { kind: nudge.kind }, ...channel() },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }

  const now = new Date();
  const dated = [...questionReminders(plan), ...goalReminders(plan)]
    .filter((r) => r.when > now)
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, MAX_PENDING - daily.filter((n) => n.time).length);
  for (const reminder of dated) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: reminder.data,
        ...(reminder.categoryIdentifier ? { categoryIdentifier: reminder.categoryIdentifier } : {}),
        ...channel(),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.when },
    });
  }
}

export async function cancelReminders() {
  if (!SUPPORTED) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
