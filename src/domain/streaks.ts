import type { DayCell } from "./types";

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * Streaks count *scheduled* days whose target was met, so skipping a Saturday
 * on a weekdays-only habit does not break the run. Unscheduled days are
 * transparent: they neither extend nor break a streak.
 *
 * `today` is excluded from breaking the current streak -- a day still in
 * progress should not read as a failure until it is over.
 */
export function streaks(cells: DayCell[], today: string): Streaks {
  const relevant = cells
    .filter((c) => c.scheduled && c.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  let longest = 0;
  let run = 0;
  for (const cell of relevant) {
    run = cell.ratio >= 1 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  let current = 0;
  for (let i = relevant.length - 1; i >= 0; i--) {
    const cell = relevant[i];
    if (cell.ratio >= 1) {
      current += 1;
    } else if (cell.date === today) {
      continue; // today is not over yet
    } else {
      break;
    }
  }

  return { current, longest };
}
