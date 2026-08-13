import { daysBetween, weekdayRow } from "@/domain/calendar";
import { INTENSITY_STEPS, intensityBucket } from "@/domain/completion";
import type { DayCell } from "@/domain/types";

const CELL = 9;
const GAP = 3;
const PITCH = CELL + GAP;
const ROWS = 7;

/** Opacity per intensity bucket. Index 0 is drawn as the empty-slot colour. */
const OPACITY = [0, 0.28, 0.5, 0.72, 1];

export function YearGrid({
  cells,
  color,
  year,
  weekStart,
  today,
}: {
  cells: DayCell[];
  color: string;
  year: number;
  weekStart: number;
  today: string;
}) {
  if (cells.length === 0) return null;

  const gridStart = cells[0].date;
  const columns = Math.ceil(cells.length / ROWS);
  const width = columns * PITCH - GAP;
  const height = ROWS * PITCH - GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`${year} activity grid`}
      style={{ display: "block" }}
    >
      {cells.map((cell) => {
        const col = Math.floor(daysBetween(gridStart, cell.date) / 7);
        const row = weekdayRow(cell.date, weekStart);

        // Padding days from the neighbouring year keep the columns square but
        // are not part of this year's story.
        const inYear = cell.date.slice(0, 4) === String(year);
        if (!inYear) return null;

        const bucket = cell.date > today ? 0 : intensityBucket(cell.ratio);

        return (
          <rect
            key={cell.date}
            x={col * PITCH}
            y={row * PITCH}
            width={CELL}
            height={CELL}
            rx={2.5}
            fill={bucket === 0 ? "var(--surface-2)" : color}
            fillOpacity={bucket === 0 ? 1 : OPACITY[bucket]}
          >
            <title>
              {`${cell.date} — ${Math.round(cell.ratio * 100)}%`}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}

export { INTENSITY_STEPS };
