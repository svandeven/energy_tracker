import { useEffect, useRef } from 'react';

import { useAuth } from '../providers/AuthProvider';
import { useData } from '../providers/DataProvider';
import { syncReminders } from './notifications';

/**
 * Re-schedules local reminders whenever the questions, their times, or the push
 * toggle change. Keyed on a cheap signature so a re-render doesn't re-schedule.
 */
export function useReminderSync() {
  const { profile } = useAuth();
  const { questions } = useData();
  const lastSignature = useRef<string | null>(null);

  const enabled = profile?.push_enabled ?? false;
  const signature = `${enabled}|${questions.map((q) => `${q.id}@${q.reminder_time}:${q.title}`).join(',')}`;

  useEffect(() => {
    if (!profile) return;
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    void syncReminders(questions, enabled);
  }, [signature, profile, questions, enabled]);
}
