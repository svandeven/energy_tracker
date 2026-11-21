import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '../lib/supabase';
import type { GoalDayStat, GoalRepeat, GoalRow, GoalTemplateRow } from '../lib/database.types';
import { type LocalDate, today } from '../lib/dates';
import { appliesOn, goalsSince, isRepeating, mergeToday, statFor } from '../lib/goals';
import { ensureGoalsForDate } from '../features/goalsApi';
import { useI18n } from '../i18n';
import { useAuth } from './AuthProvider';

export interface NewGoal {
  title: string;
  repeat: GoalRepeat;
  /** Keep it in the saved list. Repeating goals are always kept. */
  save: boolean;
  remindAt: string | null;
  /** Reuse an existing saved goal instead of saving a copy. */
  templateId?: string;
}

interface GoalsValue {
  date: LocalDate;
  /** Today's visible goals, in list order. */
  todaysGoals: GoalRow[];
  /** All loaded goal rows (the last month), including hidden ones. */
  goals: GoalRow[];
  /** Active saved and repeating goals. */
  templates: GoalTemplateRow[];
  /** Per-day totals for the whole history, with today kept live. */
  stats: GoalDayStat[];
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
  addGoal(goal: NewGoal): Promise<void>;
  toggleDone(goal: GoalRow): Promise<void>;
  /** 'today' drops it from today only; 'always' also stops it repeating. */
  removeGoal(goal: GoalRow, scope: 'today' | 'always'): Promise<void>;
  /** Sets or clears a reminder. On a repeating goal it applies every day. */
  setReminder(goal: GoalRow, time: string | null): Promise<void>;
  /** Sets or clears a repeating goal's reminder from the reminders list. */
  setTemplateReminder(template: GoalTemplateRow, time: string | null): Promise<void>;
  /** Takes a goal off the saved list. */
  forgetTemplate(template: GoalTemplateRow): Promise<void>;
}

const GoalsContext = createContext<GoalsValue | null>(null);

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { errorText } = useI18n();
  const userId = session?.user?.id ?? null;

  const [date, setDate] = useState<LocalDate>(today);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [templates, setTemplates] = useState<GoalTemplateRow[]>([]);
  const [serverStats, setServerStats] = useState<GoalDayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setError] = useState<unknown>(null);

  // Roll over to the new day when the app comes back after midnight.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDate(today());
    });
    return () => sub.remove();
  }, []);

  const reload = useCallback(async () => {
    if (!userId) {
      setGoals([]);
      setTemplates([]);
      setServerStats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: tpl, error: tplError } = await supabase
        .from('goal_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (tplError) throw tplError;
      await ensureGoalsForDate(userId, date, tpl ?? []);

      const [goalsRes, statsRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .gte('local_date', goalsSince(date))
          .order('local_date', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase.rpc('goal_day_stats'),
      ]);
      if (goalsRes.error) throw goalsRes.error;
      if (statsRes.error) throw statsRes.error;
      setTemplates(tpl ?? []);
      setGoals(goalsRes.data ?? []);
      setServerStats(statsRes.data ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches from Supabase; showing it's loading straight away is intended
    void reload();
  }, [reload]);

  const todaysGoals = useMemo(
    () => goals.filter((g) => g.local_date === date && !g.hidden),
    [goals, date],
  );

  const stats = useMemo(
    () => mergeToday(serverStats, statFor(goals, date)),
    [serverStats, goals, date],
  );

  const patchGoal = (id: string, patch: Partial<GoalRow>) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const addGoal = useCallback(
    async ({ title, repeat, save, remindAt, templateId }: NewGoal) => {
      if (!userId) return;
      const clean = title.trim();
      let template = templateId ? templates.find((t) => t.id === templateId) : undefined;

      if (!template && (save || repeat !== 'none')) {
        const { data, error } = await supabase
          .from('goal_templates')
          .insert({
            user_id: userId,
            title: clean,
            repeat,
            remind_at: remindAt,
            sort_order: templates.length,
          })
          .select()
          .single();
        if (error) throw error;
        template = data;
        setTemplates((prev) => [...prev, data]);
      } else if (template && (template.repeat !== repeat || template.remind_at !== remindAt)) {
        // Picked from the saved list but changed: keep the saved goal in step.
        const { error } = await supabase
          .from('goal_templates')
          .update({ repeat, remind_at: remindAt })
          .eq('id', template.id)
          .eq('user_id', userId);
        if (error) throw error;
        template = { ...template, repeat, remind_at: remindAt };
        const updated = template;
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }

      // A weekdays goal created at the weekend starts on Monday.
      if (template && isRepeating(template) && !appliesOn(template, date)) return;

      const existing =
        template && goals.find((g) => g.template_id === template.id && g.local_date === date);
      if (existing) {
        const { error } = await supabase
          .from('goals')
          .update({ hidden: false, remind_at: remindAt })
          .eq('id', existing.id)
          .eq('user_id', userId);
        if (error) throw error;
        patchGoal(existing.id, { hidden: false, remind_at: remindAt });
        return;
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          local_date: date,
          template_id: template?.id ?? null,
          title: template?.title ?? clean,
          remind_at: remindAt,
          sort_order: todaysGoals.length,
        })
        .select()
        .single();
      if (error) throw error;
      setGoals((prev) => [...prev, data]);
    },
    [userId, templates, goals, todaysGoals.length, date],
  );

  const toggleDone = useCallback(
    async (goal: GoalRow) => {
      if (!userId) return;
      const done_at = goal.done_at ? null : new Date().toISOString();
      patchGoal(goal.id, { done_at });
      const { error } = await supabase
        .from('goals')
        .update({ done_at })
        .eq('id', goal.id)
        .eq('user_id', userId);
      if (error) {
        patchGoal(goal.id, { done_at: goal.done_at });
        throw error;
      }
    },
    [userId],
  );

  const removeGoal = useCallback(
    async (goal: GoalRow, scope: 'today' | 'always') => {
      if (!userId) return;
      const template = templates.find((t) => t.id === goal.template_id);
      if (scope === 'always' && template) {
        const { error } = await supabase
          .from('goal_templates')
          .update({ is_active: false })
          .eq('id', template.id)
          .eq('user_id', userId);
        if (error) throw error;
        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      }
      // A repeating goal's row stays (hidden) so it isn't copied back in today.
      if (isRepeating(template) && scope === 'today') {
        patchGoal(goal.id, { hidden: true });
        const { error } = await supabase
          .from('goals')
          .update({ hidden: true })
          .eq('id', goal.id)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      }
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goal.id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    [userId, templates],
  );

  const setTemplateReminder = useCallback(
    async (template: GoalTemplateRow, time: string | null) => {
      if (!userId) return;
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, remind_at: time } : t)),
      );
      setGoals((prev) =>
        prev.map((g) =>
          g.template_id === template.id && g.local_date === date ? { ...g, remind_at: time } : g,
        ),
      );
      const [tplRes, goalRes] = await Promise.all([
        supabase
          .from('goal_templates')
          .update({ remind_at: time })
          .eq('id', template.id)
          .eq('user_id', userId),
        supabase
          .from('goals')
          .update({ remind_at: time })
          .eq('template_id', template.id)
          .eq('local_date', date)
          .eq('user_id', userId),
      ]);
      if (tplRes.error) throw tplRes.error;
      if (goalRes.error) throw goalRes.error;
    },
    [userId, date],
  );

  const setReminder = useCallback(
    async (goal: GoalRow, time: string | null) => {
      if (!userId) return;
      const template = templates.find((t) => t.id === goal.template_id);
      if (template && isRepeating(template)) {
        await setTemplateReminder(template, time);
        return;
      }
      patchGoal(goal.id, { remind_at: time });
      const { error } = await supabase
        .from('goals')
        .update({ remind_at: time })
        .eq('id', goal.id)
        .eq('user_id', userId);
      if (error) {
        patchGoal(goal.id, { remind_at: goal.remind_at });
        throw error;
      }
    },
    [userId, templates, setTemplateReminder],
  );

  const forgetTemplate = useCallback(
    async (template: GoalTemplateRow) => {
      if (!userId) return;
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      const { error } = await supabase
        .from('goal_templates')
        .update({ is_active: false })
        .eq('id', template.id)
        .eq('user_id', userId);
      if (error) {
        setTemplates((prev) => [...prev, template]);
        throw error;
      }
    },
    [userId],
  );

  const value = useMemo<GoalsValue>(
    () => ({
      date,
      todaysGoals,
      goals,
      templates,
      stats,
      loading,
      error: loadError == null ? null : errorText(loadError, 'error.loadData'),
      reload,
      addGoal,
      toggleDone,
      removeGoal,
      setReminder,
      setTemplateReminder,
      forgetTemplate,
    }),
    [
      date,
      todaysGoals,
      goals,
      templates,
      stats,
      loading,
      loadError,
      errorText,
      reload,
      addGoal,
      toggleDone,
      removeGoal,
      setReminder,
      setTemplateReminder,
      forgetTemplate,
    ],
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used inside <GoalsProvider>');
  return ctx;
}
