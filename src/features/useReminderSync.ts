import { useEffect, useRef } from 'react';

import { useI18n } from '../i18n';
import { useAuth } from '../providers/AuthProvider';
import { useData } from '../providers/DataProvider';
import { syncReminders } from './notifications';

/**
 * Re-schedules local reminders whenever the questions, their times, the push
 * toggle, or the language change. Keyed on a cheap signature so a re-render doesn't re-schedule.
 */
export function useReminderSync() {
  const { profile } = useAuth();
  const { questions } = useData();
  const { t, locale } = useI18n();
  const lastSignature = useRef<string | null>(null);

  const enabled = profile?.push_enabled ?? false;
  // Includes the locale so switching language re-schedules translated reminders.
  const signature = `${enabled}|${locale}|${questions.map((q) => `${q.id}@${q.reminder_time}:${q.title}`).join(',')}`;

  useEffect(() => {
    if (!profile) return;
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    void syncReminders(questions, enabled, {
      body: t('reminder.body'),
      channelName: t('reminder.channel'),
    });
  }, [signature, profile, questions, enabled, t]);
}
