"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { LogControl } from "@/components/LogControl";
import { isScheduled } from "@/domain/calendar";
import { clampRatio } from "@/domain/completion";
import {
  useCreateHabit,
  useDeleteHabit,
  useEntries,
  useHabits,
  useSetEntry,
} from "@/lib/api";
import type { Habit } from "@/domain/types";

export default function TodayPage() {
  const habitsQuery = useHabits();
  const today = habitsQuery.data?.today;

  const entriesQuery = useEntries(today, today);
  const setEntry = useSetEntry(today, today);
  const deleteHabit = useDeleteHabit();

  const valueFor = new Map<string, number>();
  for (const e of entriesQuery.data?.entries ?? []) valueFor.set(e.habitId, e.value);

  const habits = (habitsQuery.data?.habits ?? []).filter(
    (h) => !h.archivedOn && today && isScheduled(h.activeDays, today),
  );

  const doneCount = habits.filter(
    (h) => clampRatio(valueFor.get(h.id) ?? 0, h.targetValue) >= 1,
  ).length;
  const allDone = habits.length > 0 && doneCount === habits.length;

  // Fires a confetti burst the moment a habit's ratio first reaches 1, and a
  // bigger one the moment every scheduled habit for the day is done.
  const [habitBursts, setHabitBursts] = useState<Record<string, number>>({});
  const [dayBurst, setDayBurst] = useState(0);
  const wasDone = useRef<Map<string, boolean>>(new Map());
  const wasAllDone = useRef(false);

  useEffect(() => {
    if (!entriesQuery.data) return;
    for (const habit of habits) {
      const isDone = clampRatio(valueFor.get(habit.id) ?? 0, habit.targetValue) >= 1;
      const previously = wasDone.current.get(habit.id) ?? false;
      if (isDone && !previously) {
        setHabitBursts((b) => ({ ...b, [habit.id]: (b[habit.id] ?? 0) + 1 }));
      }
      wasDone.current.set(habit.id, isDone);
    }
    if (allDone && !wasAllDone.current) setDayBurst((n) => n + 1);
    wasAllDone.current = allDone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesQuery.data]);

  if (habitsQuery.isLoading) {
    return <p className="text-[var(--muted)]">Loading…</p>;
  }
  if (habitsQuery.error) {
    return <p className="text-red-400">{(habitsQuery.error as Error).message}</p>;
  }

  return (
    <main className="relative">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <span className="text-sm text-[var(--muted)] tabular-nums">{today}</span>
      </div>
      <p className="mb-6 text-sm text-[var(--muted)]">
        {habits.length === 0
          ? "Add a habit to start tracking."
          : allDone
            ? "Everything logged. Nice work."
            : `Drag a bar, tap +/-, or tap the number to type a value. ${doneCount}/${habits.length} done.`}
      </p>

      <ul className="space-y-2.5">
        {habits.map((habit) => {
          const value = valueFor.get(habit.id) ?? 0;
          return (
            <li
              key={habit.id}
              className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5"
            >
              <Confetti burst={habitBursts[habit.id] ?? 0} colors={[habit.color]} count={16} />

              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[15px]">{habit.name}</span>
                    <DeleteButton habit={habit} onConfirm={() => deleteHabit.mutate(habit.id)} />
                  </div>
                  <LogControl
                    habit={habit}
                    value={value}
                    onChange={(next) =>
                      setEntry.mutate({ habitId: habit.id, onDate: today!, value: next })
                    }
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <NewHabitForm />

      {dayBurst > 0 && <DayCelebration burst={dayBurst} />}
    </main>
  );
}

function DeleteButton({ habit, onConfirm }: { habit: Habit; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-1.5 text-xs">
        <span className="text-[var(--muted)]">Delete?</span>
        <button
          onClick={onConfirm}
          className="rounded px-1.5 py-0.5 text-red-400 hover:bg-red-400/10"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-1.5 py-0.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={`Delete ${habit.name}`}
      className="shrink-0 rounded p-1 text-[var(--muted)] hover:bg-red-400/10 hover:text-red-400"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <path
          d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function DayCelebration({ burst }: { burst: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, [burst]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <Confetti burst={burst} colors={COLORS} count={70} />
      <div className="animate-[pop_0.4s_ease-out] rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-6 py-4 text-center shadow-2xl backdrop-blur">
        <div className="text-2xl">🎉</div>
        <div className="mt-1 text-sm font-medium">All habits done today!</div>
      </div>
      <style jsx>{`
        @keyframes pop {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

const COLORS = [
  "#7FC7EC",
  "#F0D18C",
  "#F1A3B5",
  "#8FE2C6",
  "#B3AEE8",
  "#DFA3E6",
  "#D9A98C",
];

function NewHabitForm() {
  const create = useCreateHabit();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("times");
  const [targetValue, setTargetValue] = useState("1");
  const [color, setColor] = useState(COLORS[0]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-5 w-full rounded-xl border border-dashed border-[var(--border)] py-3 text-sm text-[var(--muted)] hover:text-[var(--text)]"
      >
        + New habit
      </button>
    );
  }

  return (
    <form
      className="mt-5 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate(
          { name, unit, targetValue: Number(targetValue), color },
          {
            onSuccess: () => {
              setName("");
              setTargetValue("1");
              setOpen(false);
            },
          },
        );
      }}
    >
      <input
        autoFocus
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--muted)]"
      />

      <div className="flex gap-2">
        <input
          required
          type="number"
          min="0.01"
          step="any"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder="target"
          className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--muted)]"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="unit (e.g. cups, steps)"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--muted)]"
        />
      </div>
      <p className="text-xs text-[var(--muted)]">
        Every habit is a daily target. Use target 1 with unit &quot;times&quot; for a
        simple yes/no habit.
      </p>

      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            onClick={() => setColor(c)}
            className="size-6 rounded-full"
            style={{
              background: c,
              outline: color === c ? "2px solid var(--text)" : "none",
              outlineOffset: 2,
            }}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-lg bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
        >
          {create.isPending ? "Adding…" : "Add habit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
