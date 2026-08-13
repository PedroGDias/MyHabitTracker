import Link from "next/link";
import { notFound } from "next/navigation";
import { YearGrid } from "@/components/YearGrid";
import {
  firstDayOfYear,
  lastDayOfYear,
  todayIn,
  yearGridDays,
} from "@/domain/calendar";
import { completionPercent, dayCells } from "@/domain/completion";
import { streaks } from "@/domain/streaks";
import { currentUser, listEntries, listHabits } from "@/server/repo";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) notFound();

  const user = await currentUser();
  const today = todayIn(user.timezone);
  const isCurrentYear = today.slice(0, 4) === String(year);
  const habits = await listHabits(user.id);

  const gridDays = yearGridDays(year, user.weekStart);
  const from = gridDays[0];
  const to = gridDays[gridDays.length - 1];
  const allEntries = await listEntries(user.id, from, to);

  const rows = habits
    .map((habit) => {
      const cells = dayCells(
        habit,
        allEntries.filter((e) => e.habitId === habit.id),
        from,
        to,
      );
      const inYear = cells.filter(
        (c) => c.date >= firstDayOfYear(year) && c.date <= lastDayOfYear(year),
      );
      return {
        habit,
        cells,
        percent: completionPercent(habit, inYear, today),
        streak: streaks(inYear, today),
      };
    })
    .sort((a, b) => b.percent - a.percent);

  const startYear = Math.min(
    ...habits.map((h) => Number(h.startedOn.slice(0, 4))),
    year,
  );
  const endYear = Math.max(Number(today.slice(0, 4)), year);
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i,
  );

  return (
    <main>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {year} In-Review
        </h1>
        <div className="flex gap-3 text-sm">
          {years.map((y) => (
            <Link
              key={y}
              href={`/review/${y}`}
              className={
                y === year
                  ? "text-[var(--text)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-[var(--muted)]">
          No habits yet. Add one on the Today page.
        </p>
      )}

      <div className="space-y-7">
        {rows.map(({ habit, cells, percent, streak }) => (
          <section key={habit.id}>
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-2.5 min-w-0">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: habit.color }}
                />
                <h2 className="truncate text-[15px]">
                  {habit.name}
                  <span className="text-[var(--muted)]">
                    {" "}
                    — {formatTarget(habit.targetValue, habit.unit)}
                  </span>
                </h2>
              </div>
              <span className="shrink-0 tabular-nums text-[15px]">
                {percent}%
              </span>
            </div>

            <YearGrid
              cells={cells}
              color={habit.color}
              year={year}
              weekStart={user.weekStart}
              today={today}
            />

            <p className="mt-1.5 text-xs text-[var(--muted)] tabular-nums">
              longest streak {streak.longest} days
              {isCurrentYear && ` · current ${streak.current}`}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}

function formatTarget(value: number, unit: string) {
  if (unit === "times" && value === 1) return "Everyday";
  return `${value.toLocaleString()} ${unit} per day`;
}
