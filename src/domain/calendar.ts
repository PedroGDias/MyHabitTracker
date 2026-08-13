/**
 * Calendar dates as plain "YYYY-MM-DD" strings.
 *
 * Every function here treats a date as a calendar date with no time and no
 * zone. Arithmetic goes through UTC-anchored Date objects purely as a vehicle
 * for day counting -- never to represent an instant. The only place a real
 * timezone is consulted is `todayIn`, which asks "what day is it *for this
 * user* right now", and that answer is then carried around as a string.
 */

/** The user's current local date, as an ISO date string. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is what we want.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const dt = toUTC(date);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** ISO-8601 weekday: Monday = 1 ... Sunday = 7. */
export function isoWeekday(date: string): number {
  const js = toUTC(date).getUTCDay(); // Sunday = 0
  return js === 0 ? 7 : js;
}

/** Does this habit's schedule include the given date's weekday? */
export function isScheduled(activeDays: number, date: string): boolean {
  return (activeDays & (1 << (isoWeekday(date) - 1))) !== 0;
}

/**
 * The first day of the week containing `date`, where `weekStart` is an ISO
 * weekday (1 = Monday). This is the key that groups days for weekly targets,
 * and the row-0 anchor for the heatmap.
 */
export function startOfWeek(date: string, weekStart: number): string {
  const offset = (isoWeekday(date) - weekStart + 7) % 7;
  return addDays(date, -offset);
}

/** Which heatmap row a date falls on: 0 = the week-start weekday. */
export function weekdayRow(date: string, weekStart: number): number {
  return (isoWeekday(date) - weekStart + 7) % 7;
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function firstDayOfYear(year: number): string {
  return `${year}-01-01`;
}

export function lastDayOfYear(year: number): string {
  return `${year}-12-31`;
}

/**
 * The full grid of days a year-heatmap draws: padded outward to whole weeks so
 * every column has seven cells. Days outside the year are included and are
 * rendered as blanks by the grid.
 */
export function yearGridDays(year: number, weekStart: number): string[] {
  const start = startOfWeek(firstDayOfYear(year), weekStart);
  const end = addDays(startOfWeek(lastDayOfYear(year), weekStart), 6);
  return eachDay(start, end);
}
