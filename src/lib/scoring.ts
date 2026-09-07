import type { CheckinRow, QuestionRow } from './database.types';
import { type LocalDate, addDays } from './dates';

/** Each question contributes 0–2, so a full day is 2 x (active questions). */
export const MAX_PER_QUESTION = 2;

export function maxDailyScore(questions: QuestionRow[]): number {
  return questions.length * MAX_PER_QUESTION;
}

export type ScoreMap = Map<string, number>;

/** question_id -> score, for a single day. */
export function scoresForDate(checkins: CheckinRow[], date: LocalDate): ScoreMap {
  const map: ScoreMap = new Map();
  for (const c of checkins) {
    if (c.local_date === date) map.set(c.question_id, c.score);
  }
  return map;
}

export interface DayTotal {
  date: LocalDate;
  /** Sum of scores logged that day. */
  total: number;
  /** How many of the active questions were answered. */
  answered: number;
  scores: ScoreMap;
}

export function dayTotal(
  checkins: CheckinRow[],
  questions: QuestionRow[],
  date: LocalDate,
): DayTotal {
  const scores = scoresForDate(checkins, date);
  let total = 0;
  let answered = 0;
  for (const q of questions) {
    const s = scores.get(q.id);
    if (s != null) {
      total += s;
      answered += 1;
    }
  }
  return { date, total, answered, scores };
}

/** Newest-first day totals over a window, for the chart and History list. */
export function dayTotalsSeries(
  checkins: CheckinRow[],
  questions: QuestionRow[],
  endDate: LocalDate,
  days: number,
): DayTotal[] {
  return Array.from({ length: days }, (_, i) =>
    dayTotal(checkins, questions, addDays(endDate, -i)),
  );
}

/**
 * Mean daily total over the `days` window, counting only days with at least one
 * check-in — an untouched day is missing data, not a zero-energy day.
 */
export function average(series: DayTotal[]): number | null {
  const logged = series.filter((d) => d.answered > 0);
  if (logged.length === 0) return null;
  return logged.reduce((sum, d) => sum + d.total, 0) / logged.length;
}

/** Centered-trailing 7-day mean, aligned to the same index as `series`. */
export function rollingAverage(series: DayTotal[], window = 7): (number | null)[] {
  // `series` is newest-first; a trailing window therefore looks *forward*.
  return series.map((_, i) => average(series.slice(i, i + window)));
}

export interface WeekComparison {
  current: number | null;
  previous: number | null;
  /** Positive means this week is better than the one before. */
  delta: number | null;
}

export function compareWeeks(
  checkins: CheckinRow[],
  questions: QuestionRow[],
  endDate: LocalDate,
): WeekComparison {
  const current = average(dayTotalsSeries(checkins, questions, endDate, 7));
  const previous = average(dayTotalsSeries(checkins, questions, addDays(endDate, -7), 7));
  return {
    current,
    previous,
    delta: current != null && previous != null ? current - previous : null,
  };
}

/** The encouraging line on the summary screen, tuned to how the day went. */
export function summaryMessage(total: number, max: number): string {
  const ratio = max > 0 ? total / max : 0;
  if (ratio >= 0.8) return "Strong day. Whatever you're doing, it's working. 🌱";
  if (ratio >= 0.5) return "Nice work checking in—small signals add up. You're finding a steady rhythm. 🌱";
  if (ratio >= 0.3) return 'A mixed day, and that\'s useful data too. Be kind to yourself. 🌱';
  return 'Low days happen. Logging one is still a win. 🌱';
}

/** "Morn 2 · Day 1 · Move 2 · Eve 1 · Mood 2" on the History rows. */
export function shortLabel(title: string): string {
  const first = title.split(/[\s&]+/)[0];
  const map: Record<string, string> = {
    Morning: 'Morn',
    Daytime: 'Day',
    Movement: 'Move',
    Evening: 'Eve',
    Mental: 'Mood',
  };
  return map[first] ?? first.slice(0, 4);
}

export function breakdownLine(day: DayTotal, questions: QuestionRow[]): string {
  return questions
    .map((q) => {
      const s = day.scores.get(q.id);
      return `${shortLabel(q.title)} ${s == null ? '–' : s}`;
    })
    .join(' · ');
}
