import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  isScheduled,
  isoWeekday,
  startOfWeek,
  todayIn,
  weekdayRow,
  yearGridDays,
} from "./calendar";
import { clampRatio, completionPercent, dayCells, intensityBucket } from "./completion";
import { niceStep } from "./steps";
import { streaks } from "./streaks";
import type { Habit } from "./types";

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  userId: "u1",
  name: "Test",
  unit: "times",
  targetValue: 1,
  activeDays: 127,
  color: "#fff",
  startedOn: "2026-01-01",
  archivedOn: null,
  sortOrder: 0,
  ...over,
});

describe("calendar", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2028-01-01", "2029-01-01")).toBe(366);
  });

  it("survives a DST transition without drifting", () => {
    // Europe/Lisbon springs forward on 2026-03-29. Pure date arithmetic must
    // not lose or gain a day across it.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("reads the local date, not the UTC one", () => {
    // 00:30 in Lisbon on the 5th is still the 4th in UTC-3.
    const instant = new Date("2026-06-05T00:30:00+01:00");
    expect(todayIn("Europe/Lisbon", instant)).toBe("2026-06-05");
    expect(todayIn("America/Sao_Paulo", instant)).toBe("2026-06-04");
  });

  it("numbers weekdays ISO-style", () => {
    expect(isoWeekday("2026-08-10")).toBe(1); // Monday
    expect(isoWeekday("2026-08-16")).toBe(7); // Sunday
  });

  it("anchors weeks to the user's week start", () => {
    expect(startOfWeek("2026-08-13", 1)).toBe("2026-08-10"); // Mon-start
    expect(startOfWeek("2026-08-13", 7)).toBe("2026-08-09"); // Sun-start
    expect(weekdayRow("2026-08-10", 1)).toBe(0);
    expect(weekdayRow("2026-08-09", 7)).toBe(0);
  });

  it("pads the year grid to whole weeks", () => {
    const days = yearGridDays(2026, 1);
    expect(days.length % 7).toBe(0);
    expect(isoWeekday(days[0])).toBe(1);
    expect(days[0] <= "2026-01-01").toBe(true);
    expect(days[days.length - 1] >= "2026-12-31").toBe(true);
  });

  it("respects an active-days bitmask", () => {
    const weekdaysOnly = 0b0011111; // Mon..Fri
    expect(isScheduled(weekdaysOnly, "2026-08-14")).toBe(true); // Friday
    expect(isScheduled(weekdaysOnly, "2026-08-15")).toBe(false); // Saturday
  });
});

describe("completion", () => {
  it("clamps overshoot so one big day cannot mask misses", () => {
    expect(clampRatio(30000, 10000)).toBe(1);
    expect(clampRatio(5000, 10000)).toBe(0.5);
    expect(clampRatio(0, 10000)).toBe(0);
  });

  it("buckets intensity with empty and full at the ends", () => {
    expect(intensityBucket(0)).toBe(0);
    expect(intensityBucket(1)).toBe(4);
    expect(intensityBucket(2)).toBe(4);
    expect(intensityBucket(0.5)).toBeGreaterThan(0);
    expect(intensityBucket(0.5)).toBeLessThan(4);
  });

  it("compares each day against its own target", () => {
    const h = habit({ targetValue: 200, unit: "pages" });
    const cells = dayCells(
      h,
      [{ habitId: "h1", onDate: "2026-08-16", value: 200 }],
      "2026-08-10",
      "2026-08-16",
    );
    expect(cells.find((c) => c.date === "2026-08-16")!.ratio).toBe(1);
    expect(cells.find((c) => c.date === "2026-08-15")!.ratio).toBe(0);
  });

  it("divides by elapsed days, not the whole window", () => {
    const h = habit({ startedOn: "2026-01-01" });
    const cells = dayCells(
      h,
      [
        { habitId: "h1", onDate: "2026-01-01", value: 1 },
        { habitId: "h1", onDate: "2026-01-02", value: 1 },
      ],
      "2026-01-01",
      "2026-12-31",
    );
    // Two of two elapsed days done, with the rest of the year still ahead.
    expect(completionPercent(h, cells, "2026-01-02")).toBe(100);
  });

  it("ignores unscheduled days in the denominator", () => {
    const h = habit({ activeDays: 0b0011111, startedOn: "2026-08-10" });
    const cells = dayCells(
      h,
      [
        { habitId: "h1", onDate: "2026-08-10", value: 1 },
        { habitId: "h1", onDate: "2026-08-11", value: 1 },
        { habitId: "h1", onDate: "2026-08-12", value: 1 },
        { habitId: "h1", onDate: "2026-08-13", value: 1 },
        { habitId: "h1", onDate: "2026-08-14", value: 1 },
      ],
      "2026-08-10",
      "2026-08-16",
    );
    // Sat and Sun are blank but unscheduled, so the week is still perfect.
    expect(completionPercent(h, cells, "2026-08-16")).toBe(100);
  });

  it("excludes days before the habit existed", () => {
    const h = habit({ startedOn: "2026-06-01" });
    const cells = dayCells(
      h,
      [{ habitId: "h1", onDate: "2026-06-01", value: 1 }],
      "2026-01-01",
      "2026-06-01",
    );
    expect(completionPercent(h, cells, "2026-06-01")).toBe(100);
  });
});

describe("niceStep", () => {
  it("picks a fine step for small targets", () => {
    expect(niceStep(8)).toBe(1);
  });

  it("picks a round step for large targets, capping the number of taps", () => {
    expect(niceStep(10000)).toBe(500);
    expect(10000 / niceStep(10000)).toBeLessThanOrEqual(20);
  });

  it("never exceeds the target itself for tiny targets", () => {
    expect(niceStep(1)).toBeLessThanOrEqual(1);
  });
});

describe("streaks", () => {
  const cells = (done: string[], from: string, to: string) =>
    dayCells(
      habit(),
      done.map((d) => ({ habitId: "h1", onDate: d, value: 1 })),
      from,
      to,
    );

  it("counts consecutive met days", () => {
    const c = cells(
      ["2026-08-10", "2026-08-11", "2026-08-12"],
      "2026-08-10",
      "2026-08-12",
    );
    expect(streaks(c, "2026-08-12")).toEqual({ current: 3, longest: 3 });
  });

  it("breaks on a miss but keeps the longest run", () => {
    const c = cells(
      ["2026-08-10", "2026-08-11", "2026-08-13"],
      "2026-08-10",
      "2026-08-13",
    );
    expect(streaks(c, "2026-08-13")).toEqual({ current: 1, longest: 2 });
  });

  it("does not let an unfinished today break the streak", () => {
    const c = cells(["2026-08-11", "2026-08-12"], "2026-08-10", "2026-08-13");
    // Nothing logged today yet -- yesterday's run should still stand.
    expect(streaks(c, "2026-08-13").current).toBe(2);
  });
});
