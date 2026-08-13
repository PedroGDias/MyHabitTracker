/**
 * Seeds the dev user plus the habits from the design reference, with enough
 * generated history that the year grid has something to draw. Every habit is
 * a daily target -- the two habits that were weekly in the reference
 * screenshot (Read 200 pages/week, Journal 200 words/week) become their
 * daily-equivalent targets (~30/day).
 *
 * Idempotent: wipes and rewrites. Run with `npm run db:seed`.
 */
import { db } from "./client";
import { entries, habits, users } from "./schema";
import { eachDay, todayIn } from "../domain/calendar";

const TIMEZONE = "Europe/Lisbon";
const WEEK_START = 1; // Monday

const SPEC = [
  { name: "Drink Water",   unit: "cups",    target: 8,     color: "#7FC7EC", rate: 0.86 },
  { name: "Wake Up Early", unit: "times",   target: 1,     color: "#F0D18C", rate: 0.86 },
  { name: "Read",          unit: "pages",   target: 30,    color: "#F1A3B5", rate: 0.74 },
  { name: "Steps",         unit: "steps",   target: 10000, color: "#8FE2C6", rate: 0.71 },
  { name: "Study",         unit: "minutes", target: 180,   color: "#B3AEE8", rate: 0.66 },
  { name: "Sleep",         unit: "hours",   target: 8,     color: "#DFA3E6", rate: 0.65 },
  { name: "Journal",       unit: "words",   target: 30,    color: "#D9A98C", rate: 0.62 },
];

/**
 * Draws a ratio whose mean lands near `rate`: either a met target, or a
 * partial day averaging ~0.45. Solving for the hit probability keeps the
 * generated percentages close to the numbers in the design reference.
 */
function drawRatio(rate: number): number {
  const hit = Math.max(0, Math.min(1, (rate - 0.45) / 0.55));
  return Math.random() < hit ? 1 + Math.random() * 0.15 : Math.random() * 0.9;
}

/** Cups and steps are whole things; hours are not. */
function round(value: number, unit: string): number {
  return unit === "hours"
    ? Math.round(value * 10) / 10
    : Math.max(1, Math.round(value));
}

async function main() {
  await db.delete(entries);
  await db.delete(habits);
  await db.delete(users);

  const [user] = await db
    .insert(users)
    .values({ email: "dev@localhost", timezone: TIMEZONE, weekStart: WEEK_START })
    .returning();

  const today = todayIn(TIMEZONE);
  const startedOn = "2025-01-01";

  const rows = await db
    .insert(habits)
    .values(
      SPEC.map((s, i) => ({
        userId: user.id,
        name: s.name,
        unit: s.unit,
        targetValue: s.target,
        activeDays: 127,
        color: s.color,
        startedOn,
        sortOrder: i,
      })),
    )
    .returning();

  const days = eachDay(startedOn, today);
  const payload: { habitId: string; onDate: string; value: number }[] = [];

  rows.forEach((habit, i) => {
    const spec = SPEC[i];
    for (const day of days) {
      const ratio = drawRatio(spec.rate);

      // A binary habit has no partial state: it either happened or it did
      // not. Rounding a 0.4 up to 1 would make every habit look perfect.
      if (spec.target === 1) {
        if (ratio >= 1) payload.push({ habitId: habit.id, onDate: day, value: 1 });
        continue;
      }

      if (ratio <= 0.02) continue; // a genuinely blank day
      payload.push({
        habitId: habit.id,
        onDate: day,
        value: round(spec.target * ratio, spec.unit),
      });
    }
  });

  for (let i = 0; i < payload.length; i += 1000) {
    await db.insert(entries).values(payload.slice(i, i + 1000));
  }

  console.log(
    `Seeded ${rows.length} habits and ${payload.length} entries (${startedOn} .. ${today}).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
