/**
 * All check-in dates are *local* calendar dates ('YYYY-MM-DD'), never UTC
 * instants — a 9:30 PM evening check-in must belong to that evening's day.
 * Formatting for display lives in src/i18n, since it depends on the language.
 */

export type LocalDate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(d: Date): LocalDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): LocalDate {
  return toLocalDate(new Date());
}

/** Parses 'YYYY-MM-DD' at local midnight (not UTC, which would shift the day). */
export function parseLocalDate(date: LocalDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: LocalDate, delta: number): LocalDate {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + delta);
  return toLocalDate(d);
}

/** Inclusive descending run of dates ending at `end`, e.g. last 30 days. */
export function lastNDates(end: LocalDate, n: number): LocalDate[] {
  return Array.from({ length: n }, (_, i) => addDays(end, -i));
}

export function isToday(date: LocalDate): boolean {
  return date === today();
}

/** True for any date after today — you can't log energy you haven't had yet. */
export function isFuture(date: LocalDate): boolean {
  return date > today();
}

/** Whole days from `date` up to today; 0 for today, 1 for yesterday. */
export function daysAgo(date: LocalDate): number {
  const ms = parseLocalDate(today()).getTime() - parseLocalDate(date).getTime();
  return Math.round(ms / 86_400_000);
}

/** Basic shape check so a hand-edited URL can't produce an invalid query. */
export function isValidLocalDate(value: string | undefined): value is LocalDate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseLocalDate(value);
  return !Number.isNaN(d.getTime()) && toLocalDate(d) === value;
}

/** '08:00:00' -> { hour: 8, minute: 0 } for scheduling notifications. */
export function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m || 0 };
}
