import {
  date,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  timezone: text("timezone").notNull().default("Europe/Lisbon"),
  /** ISO weekday the week starts on: 1 = Monday. */
  weekStart: smallint("week_start").notNull().default(1),
});

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  /** A binary habit is simply targetValue 1 with unit "times". */
  targetValue: doublePrecision("target_value").notNull(),
  /** Bitmask, bit 0 = Monday. 127 = every day. */
  activeDays: smallint("active_days").notNull().default(127),
  color: text("color").notNull(),
  startedOn: date("started_on").notNull(),
  archivedOn: date("archived_on"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const entries = pgTable(
  "entries",
  {
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    /** The user's LOCAL calendar date, never derived from a UTC timestamp. */
    onDate: date("on_date").notNull(),
    value: doublePrecision("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.onDate] })],
);
