import { supabase } from '../lib/supabase';
import type { LocalDate } from '../lib/dates';

/**
 * Check-in writes that must also work outside the React tree — the score
 * buttons on a question reminder can run while the app is in the background,
 * before any provider has loaded.
 */

/** What a question reminder carries so its score buttons know what to save. */
export interface QuestionNotificationData {
  kind: 'question';
  questionId: string;
  /** The day the reminder asks about (the day before, for next-day questions). */
  date: LocalDate;
}

export function isQuestionNotification(data: unknown): data is QuestionNotificationData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { kind?: unknown }).kind === 'question' &&
    typeof (data as { questionId?: unknown }).questionId === 'string' &&
    typeof (data as { date?: unknown }).date === 'string'
  );
}

/** Saves the score picked on a reminder. Safe to run twice: it's an upsert. */
export async function saveScoreFromNotification(data: QuestionNotificationData, score: number): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return;
  const { error } = await supabase
    .from('checkins')
    .upsert(
      { user_id: userId, question_id: data.questionId, local_date: data.date, score },
      { onConflict: 'user_id,question_id,local_date' },
    );
  if (error) throw error;
}
