import type { GoalDayStat, GoalRow, GoalTemplateRow } from './database.types';
import { type LocalDate, addDays, lastNDates, parseLocalDate } from './dates';

/**
 * Daily-goal rules, kept free of React and Supabase so they're easy to reason
 * about. A day "counts" only if it had goals; a day is "met" when every one of
 * its goals was ticked off. Days without goals neither break nor extend a
 * streak.
 */

/** Whether a repeating template puts a goal on `date`. */
export function appliesOn(template: Pick<GoalTemplateRow, 'repeat'>, date: LocalDate): boolean {
  if (template.repeat === 'daily') return true;
  if (template.repeat === 'weekdays') {
    const day = parseLocalDate(date).getDay();
    return day >= 1 && day <= 5;
  }
  return false;
}

export const isRepeating = (template: Pick<GoalTemplateRow, 'repeat'> | null | undefined) =>
  template != null && template.repeat !== 'none';

export const isMet = (stat: GoalDayStat | undefined) =>
  stat != null && stat.total > 0 && stat.done === stat.total;

export const rate = (stat: GoalDayStat | undefined) =>
  stat && stat.total > 0 ? stat.done / stat.total : null;

/** Today's numbers from the loaded rows, so ticks show up without a refetch. */
export function statFor(goals: GoalRow[], date: LocalDate): GoalDayStat {
  const visible = goals.filter((g) => g.local_date === date && !g.hidden);
  return { local_date: date, total: visible.length, done: visible.filter((g) => g.done_at).length };
}

/** Server stats with today's entry replaced by the live one. */
export function mergeToday(stats: GoalDayStat[], live: GoalDayStat): GoalDayStat[] {
  const rest = stats.filter((s) => s.local_date !== live.local_date);
  return live.total > 0 ? [...rest, live].sort(byDate) : rest;
}

const byDate = (a: GoalDayStat, b: GoalDayStat) => a.local_date.localeCompare(b.local_date);

/**
 * Consecutive met days ending today. An unfinished today doesn't break the
 * streak — it just hasn't joined it yet.
 */
export function currentStreak(stats: GoalDayStat[], today: LocalDate): number {
  const days = stats.filter((s) => s.total > 0 && s.local_date <= today).sort(byDate).reverse();
  let streak = 0;
  for (const day of days) {
    if (isMet(day)) streak++;
    else if (day.local_date === today) continue;
    else break;
  }
  return streak;
}

export interface CompletionPoint {
  date: LocalDate;
  /** 0–1, or null for a day without goals. */
  rate: number | null;
  /** Mean rate over the 7 days ending here (days with goals only). */
  average: number | null;
}

/** The last `days` days, oldest first, for the completion chart. */
export function completionSeries(stats: GoalDayStat[], today: LocalDate, days = 7): CompletionPoint[] {
  const byDay = new Map(stats.map((s) => [s.local_date, s]));
  const average = (end: LocalDate) => {
    const rates = lastNDates(end, 7)
      .map((d) => rate(byDay.get(d)))
      .filter((r): r is number => r != null);
    return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  };
  return lastNDates(today, days)
    .reverse()
    .map((date) => ({ date, rate: rate(byDay.get(date)), average: average(date) }));
}

export interface ReliableGoal {
  title: string;
  rate: number;
  days: number;
}

/** Goals that came up at least `minDays` times, best kept first. */
export function reliableGoals(goals: GoalRow[], today: LocalDate, minDays = 3, limit = 3): ReliableGoal[] {
  const groups = new Map<string, { title: string; done: number; days: number }>();
  for (const goal of goals) {
    // Today is still in progress, so it would only drag every rate down.
    if (goal.hidden || goal.local_date >= today) continue;
    const key = goal.title.trim().toLowerCase();
    const group = groups.get(key) ?? { title: goal.title.trim(), done: 0, days: 0 };
    group.days++;
    if (goal.done_at) group.done++;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.days >= minDays)
    .map((g) => ({ title: g.title, rate: g.done / g.days, days: g.days }))
    .sort((a, b) => b.rate - a.rate || b.days - a.days)
    .slice(0, limit);
}

export type AwardId = 'firstDay' | 'weekly' | 'monthly' | 'hundred';

export interface Award {
  id: AwardId;
  /** Met days needed (in a row, except for monthly). */
  target: number;
  /** How many times it's been earned; the repeatable ones keep counting. */
  count: number;
  /** When it was first earned. */
  earnedOn: LocalDate | null;
  /** Progress toward the next one: met days so far out of `target`. */
  progress: number;
  /** Met days still needed for the next one. */
  remaining: number;
}

/**
 * - First full day: one met day.
 * - Weekly: 7 met days in a row (again for every further 7).
 * - Monthly: 30 met days in total, any order (again for every further 30).
 * - 100 days: 100 met days in a row.
 */
export function computeAwards(stats: GoalDayStat[], today: LocalDate): Award[] {
  const days = stats.filter((s) => s.total > 0 && s.local_date <= today).sort(byDate);
  let run = 0;
  let metTotal = 0;
  let firstMet: LocalDate | null = null;
  let weeklyCount = 0;
  let weeklyFirst: LocalDate | null = null;
  let monthlyFirst: LocalDate | null = null;
  let hundredCount = 0;
  let hundredFirst: LocalDate | null = null;

  for (const day of days) {
    if (!isMet(day)) {
      // An unfinished today leaves the running streak alone.
      if (day.local_date !== today) run = 0;
      continue;
    }
    run++;
    metTotal++;
    firstMet ??= day.local_date;
    if (run % 7 === 0) {
      weeklyCount++;
      weeklyFirst ??= day.local_date;
    }
    if (metTotal === 30) monthlyFirst = day.local_date;
    if (run % 100 === 0) {
      hundredCount++;
      hundredFirst ??= day.local_date;
    }
  }

  const streak = currentStreak(stats, today);
  return [
    {
      id: 'firstDay',
      target: 1,
      count: firstMet ? 1 : 0,
      earnedOn: firstMet,
      progress: firstMet ? 1 : 0,
      remaining: firstMet ? 0 : 1,
    },
    {
      id: 'weekly',
      target: 7,
      count: weeklyCount,
      earnedOn: weeklyFirst,
      progress: streak % 7,
      remaining: 7 - (streak % 7),
    },
    {
      id: 'monthly',
      target: 30,
      count: Math.floor(metTotal / 30),
      earnedOn: monthlyFirst,
      progress: metTotal % 30,
      remaining: 30 - (metTotal % 30),
    },
    {
      id: 'hundred',
      target: 100,
      count: hundredCount,
      earnedOn: hundredFirst,
      progress: streak % 100,
      remaining: 100 - (streak % 100),
    },
  ];
}

/** The award closest to being earned (again). First full day only until it's earned. */
export function nextAward(awards: Award[]): Award {
  const candidates = awards.filter((a) => a.id !== 'firstDay' || a.count === 0);
  return candidates.reduce((best, a) => (a.remaining < best.remaining ? a : best));
}

/** Today plus the number of days back that the goals list keeps loaded. */
export const GOALS_WINDOW_DAYS = 30;

export const goalsSince = (today: LocalDate) => addDays(today, -GOALS_WINDOW_DAYS);
