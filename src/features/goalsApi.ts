import { supabase } from '../lib/supabase';
import type { GoalTemplateRow } from '../lib/database.types';
import type { LocalDate } from '../lib/dates';
import { appliesOn } from '../lib/goals';

/**
 * Goal writes that must also work outside the React tree — the notification
 * "Done" button can run while the app is in the background, before any
 * provider has loaded.
 */

/**
 * Copies the user's repeating goals onto `date` if they aren't there yet. Safe
 * to call repeatedly and from several places at once: the unique
 * (user, template, day) constraint turns duplicates into no-ops.
 */
export async function ensureGoalsForDate(
  userId: string,
  date: LocalDate,
  templates?: GoalTemplateRow[],
): Promise<void> {
  let active = templates;
  if (!active) {
    const { data, error } = await supabase
      .from('goal_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) throw error;
    active = data ?? [];
  }
  const rows = active
    .filter((t) => t.is_active && appliesOn(t, date))
    .map((t) => ({
      user_id: userId,
      local_date: date,
      template_id: t.id,
      title: t.title,
      remind_at: t.remind_at,
      sort_order: t.sort_order,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('goals')
    .upsert(rows, { onConflict: 'user_id,template_id,local_date', ignoreDuplicates: true });
  if (error) throw error;
}

/** What a goal notification carries so its Done button can find the goal. */
export interface GoalNotificationData {
  kind: 'goal';
  date: LocalDate;
  goalId?: string;
  templateId?: string;
}

export function isGoalNotification(data: unknown): data is GoalNotificationData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { kind?: unknown }).kind === 'goal' &&
    typeof (data as { date?: unknown }).date === 'string'
  );
}

/**
 * Ticks off the goal a notification was about. Repeating goals are referenced
 * by template, because the reminder may fire on a day the app hasn't opened
 * yet — so the day's goals are created first.
 */
export async function completeGoalFromNotification(data: GoalNotificationData): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return;
  const doneAt = new Date().toISOString();

  if (data.goalId) {
    const { error } = await supabase
      .from('goals')
      .update({ done_at: doneAt })
      .eq('id', data.goalId)
      .eq('user_id', userId)
      .is('done_at', null);
    if (error) throw error;
    return;
  }

  if (data.templateId) {
    await ensureGoalsForDate(userId, data.date);
    const { error } = await supabase
      .from('goals')
      .update({ done_at: doneAt })
      .eq('user_id', userId)
      .eq('template_id', data.templateId)
      .eq('local_date', data.date)
      .is('done_at', null);
    if (error) throw error;
  }
}
