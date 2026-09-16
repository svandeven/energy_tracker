/**
 * All check-in dates are *local* calendar dates ('YYYY-MM-DD'), never UTC
 * instants — a 9:30 PM evening check-in must belong to that evening's day.
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "Tue, May 14" — dashboard eyebrow and History row titles. */
export function formatShortDate(date: LocalDate): string {
  const d = parseLocalDate(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** "Tuesday, June 17, 2025" — the summary screen subtitle. */
export function formatLongDate(date: LocalDate): string {
  const d = parseLocalDate(date);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  return `${weekday}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "May 1" — chart axis ticks. */
export function formatAxisDate(date: LocalDate): string {
  const d = parseLocalDate(date);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
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

/** "Today" / "Yesterday" / "Mon, May 13" for backfill lists and headers. */
export function formatDayLabel(date: LocalDate): string {
  const ago = daysAgo(date);
  if (ago === 0) return 'Today';
  if (ago === 1) return 'Yesterday';
  return formatShortDate(date);
}

/** Basic shape check so a hand-edited URL can't produce an invalid query. */
export function isValidLocalDate(value: string | undefined): value is LocalDate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseLocalDate(value);
  return !Number.isNaN(d.getTime()) && toLocalDate(d) === value;
}

/** "Good morning" / "Good afternoon" / "Good evening" for the dashboard greeting. */
export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Postgres `time` ('08:00:00') -> '8:00 AM' for the notification schedule. */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

/** '08:00:00' -> { hour: 8, minute: 0 } for scheduling notifications. */
export function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m || 0 };
}
