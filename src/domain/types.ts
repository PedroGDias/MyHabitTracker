export interface Habit {
  id: string;
  userId: string;
  name: string;
  unit: string;
  targetValue: number;
  /** Bitmask, bit 0 = Monday ... bit 6 = Sunday. 127 = every day. */
  activeDays: number;
  color: string;
  startedOn: string; // ISO date, e.g. "2026-01-01"
  archivedOn: string | null;
  sortOrder: number;
}

export interface Entry {
  habitId: string;
  onDate: string; // ISO date
  value: number;
}

export interface DayCell {
  date: string; // ISO date
  ratio: number; // 0..1, clamped
  scheduled: boolean; // does active_days include this weekday
}
