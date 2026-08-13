import { eachDay, isScheduled } from "./calendar";
import type { DayCell, Entry, Habit } from "./types";

/** Five buckets: 0 = nothing logged, 4 = target met. */
export const INTENSITY_STEPS = 5;

export function clampRatio(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, value / target));
}

/**
 * A ratio at or above 1 is a met target. Capping here is deliberate: a
 * 30,000-step day must not compensate for three missed ones.
 */
export function intensityBucket(ratio: number): number {
  if (ratio <= 0) return 0;
  if (ratio >= 1) return INTENSITY_STEPS - 1;
  return 1 + Math.floor(ratio * (INTENSITY_STEPS - 2));
}

function entriesByDate(entries: Entry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.onDate, (m.get(e.onDate) ?? 0) + e.value);
  return m;
}

/** Ratio for every day in [from, to], each day compared against its own target. */
export function dayCells(
  habit: Habit,
  entries: Entry[],
  from: string,
  to: string,
): DayCell[] {
  const byDate = entriesByDate(entries);
  return eachDay(from, to).map((date) => ({
    date,
    scheduled: isScheduled(habit.activeDays, date),
    ratio: clampRatio(byDate.get(date) ?? 0, habit.targetValue),
  }));
}

/**
 * Completion over a window, as a fraction.
 *
 * The denominator is *elapsed scheduled* days -- days on or before `today`,
 * on or after the habit started, whose weekday the habit is scheduled for.
 * Dividing by a whole year instead would show every habit as failing in
 * January.
 */
export function completionRate(
  habit: Habit,
  cells: DayCell[],
  today: string,
): number {
  let sum = 0;
  let count = 0;
  for (const cell of cells) {
    if (!cell.scheduled) continue;
    if (cell.date > today) continue;
    if (cell.date < habit.startedOn) continue;
    if (habit.archivedOn && cell.date > habit.archivedOn) continue;
    sum += cell.ratio;
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
}

export function completionPercent(
  habit: Habit,
  cells: DayCell[],
  today: string,
): number {
  return Math.round(completionRate(habit, cells, today) * 100);
}
