"use client";

import { useRef, useState } from "react";
import { clampRatio } from "@/domain/completion";
import { niceStep } from "@/domain/steps";
import type { Habit } from "@/domain/types";

/**
 * A binary habit is `targetValue === 1`, so it gets a toggle; everything else
 * gets a draggable bar. Same underlying value either way -- this is a
 * presentation decision, not a data one.
 *
 * The bar itself is drag-to-set (capped at the target, for a predictable
 * gesture), while the number is always tap-to-type and the +/- buttons always
 * work past the target -- both are how you log an overachieving day.
 */
export function LogControl({
  habit,
  value,
  onChange,
}: {
  habit: Habit;
  value: number;
  onChange: (next: number) => void;
}) {
  const binary = habit.targetValue === 1;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const shown = dragValue ?? value;
  const ratio = clampRatio(shown, habit.targetValue);
  const over = shown > habit.targetValue;
  const step = niceStep(habit.targetValue);

  if (binary) {
    return (
      <button
        onClick={() => onChange(value >= 1 ? 0 : 1)}
        aria-pressed={value >= 1}
        aria-label={`Mark ${habit.name} ${value >= 1 ? "not done" : "done"}`}
        className="grid size-11 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-95"
        style={{
          borderColor: value >= 1 ? habit.color : "var(--border)",
          background: value >= 1 ? habit.color : "transparent",
        }}
      >
        {value >= 1 && (
          <svg viewBox="0 0 24 24" className="size-6" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#0b0b0d"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    );
  }

  function valueFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = fraction * habit.targetValue;
    return Math.round(raw / step) * step;
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (editing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragValue(valueFromPointer(e.clientX));
  }

  function moveDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragValue === null) return;
    setDragValue(valueFromPointer(e.clientX));
  }

  function endDrag() {
    if (dragValue === null) return;
    onChange(Math.max(0, dragValue));
    setDragValue(null);
  }

  function commitDraft() {
    const n = Number(draft);
    if (Number.isFinite(n) && n >= 0) onChange(n);
    setEditing(false);
  }

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        {editing ? (
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDraft();
              if (e.key === "Escape") setEditing(false);
            }}
            onFocus={(e) => e.currentTarget.select()}
            className="w-24 rounded-md border border-[var(--muted)] bg-[var(--surface-2)] px-2 py-0.5 text-sm tabular-nums outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(String(shown));
              setEditing(true);
            }}
            className="rounded px-1 -mx-1 text-sm tabular-nums hover:bg-[var(--surface-2)]"
          >
            <span
              className="font-medium"
              style={{ color: over ? habit.color : "var(--text)" }}
            >
              {formatNum(shown)}
            </span>
            <span className="text-[var(--muted)]">
              {" "}
              / {formatNum(habit.targetValue)} {habit.unit}
              {over && " +"}
            </span>
          </button>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => onChange(Math.max(0, value - step))}
            aria-label={`Decrease ${habit.name}`}
            className="size-7 rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] active:scale-95"
          >
            −
          </button>
          <button
            onClick={() => onChange(value + step)}
            aria-label={`Increase ${habit.name}`}
            className="size-7 rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-5 w-full cursor-grab touch-none active:cursor-grabbing"
      >
        <div className="absolute inset-y-0 my-auto h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{
              width: `${Math.min(1, ratio) * 100}%`,
              background: habit.color,
              boxShadow: over ? `0 0 8px ${habit.color}` : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}
