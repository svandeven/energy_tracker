import { useEffect, useRef } from 'react';

import { useI18n } from '../i18n';
import { useAuth } from '../providers/AuthProvider';
import { useData } from '../providers/DataProvider';
import { useGoals } from '../providers/GoalsProvider';
import { addDays } from '../lib/dates';
import { syncReminders } from './notifications';

/**
 * Re-schedules local reminders whenever the questions, recent answers, goals,
 * their times, the push toggle, the day or the language change. Keyed on a cheap signature so a
 * re-render doesn't re-schedule.
 */
export function useReminderSync() {
  const { profile } = useAuth();
  const { questions, checkins } = useData();
  const { templates, todaysGoals, date, loading: goalsLoading } = useGoals();
  const { t, locale } = useI18n();
  const lastSignature = useRef<string | null>(null);

  const enabled = profile?.push_enabled ?? false;
  // Only yesterday onwards can still cancel an upcoming reminder.
  const recentCheckins = checkins.filter((c) => c.local_date >= addDays(date, -1));
  // Includes the locale so switching language re-schedules translated reminders.
  const signature = [
    enabled,
    locale,
    date,
    profile?.goal_plan_time,
    profile?.goal_review_time,
    questions.map((q) => `${q.id}@${q.reminder_time}${q.reminder_next_day ? '+1' : ''}:${q.title}`).join(','),
    recentCheckins.map((c) => `${c.question_id}@${c.local_date}`).sort().join(','),
    templates.map((tpl) => `${tpl.id}@${tpl.remind_at}/${tpl.repeat}:${tpl.title}`).join(','),
    todaysGoals.map((g) => `${g.id}@${g.remind_at}${g.done_at ? '✓' : ''}:${g.title}`).join(','),
  ].join('|');

  useEffect(() => {
    // Wait for the goals too, or the first pass would drop their reminders.
    if (!profile || goalsLoading) return;
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    void syncReminders({
      enabled,
      questions,
      checkins: recentCheckins,
      goalPlanTime: profile.goal_plan_time ?? null,
      goalReviewTime: profile.goal_review_time ?? null,
      templates,
      todaysGoals,
      today: date,
      text: {
        body: t('reminder.body'),
        bodyNextDay: t('reminder.bodyNextDay'),
        channelName: t('reminder.channel'),
        goalPlanTitle: t('reminder.goalPlanTitle'),
        goalPlanBody: t('reminder.goalPlanBody'),
        goalReviewTitle: t('reminder.goalReviewTitle'),
        goalReviewBody: t('reminder.goalReviewBody'),
        goalBody: t('reminder.goalBody'),
        doneAction: t('reminder.doneAction'),
      },
    });
  }, [signature, profile, goalsLoading, questions, recentCheckins, templates, todaysGoals, date, enabled, t]);
}
