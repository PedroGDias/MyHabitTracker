import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { entries, habits, users } from "@/db/schema";
import type { Entry, Habit } from "@/domain/types";

/**
 * Single-user for now. When auth lands this becomes a session lookup and every
 * caller below keeps working unchanged -- that is the whole reason `user_id`
 * exists on `habits` already.
 */
export async function currentUser() {
  const [user] = await db.select().from(users).limit(1);
  if (!user) throw new Error("No user found. Run `npm run db:seed`.");
  return user;
}

export async function listHabits(userId: string): Promise<Habit[]> {
  const rows = await db
    .select()
    .from(habits)
    .where(eq(habits.userId, userId))
    .orderBy(asc(habits.sortOrder));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    unit: r.unit,
    targetValue: r.targetValue,
    activeDays: r.activeDays,
    color: r.color,
    startedOn: r.startedOn,
    archivedOn: r.archivedOn,
    sortOrder: r.sortOrder,
  }));
}

export async function listEntries(
  userId: string,
  from: string,
  to: string,
): Promise<Entry[]> {
  const rows = await db
    .select({
      habitId: entries.habitId,
      onDate: entries.onDate,
      value: entries.value,
    })
    .from(entries)
    .innerJoin(habits, eq(habits.id, entries.habitId))
    .where(
      and(
        eq(habits.userId, userId),
        gte(entries.onDate, from),
        lte(entries.onDate, to),
      ),
    );
  return rows;
}

/**
 * Upsert on the natural key. A value of 0 clears the day rather than storing a
 * zero row, so "nothing logged" and "logged nothing" stay the same state.
 */
export async function setEntry(habitId: string, onDate: string, value: number) {
  if (value <= 0) {
    await db
      .delete(entries)
      .where(and(eq(entries.habitId, habitId), eq(entries.onDate, onDate)));
    return;
  }

  await db
    .insert(entries)
    .values({ habitId, onDate, value })
    .onConflictDoUpdate({
      target: [entries.habitId, entries.onDate],
      set: { value, updatedAt: sql`now()` },
    });
}

export async function createHabit(input: {
  userId: string;
  name: string;
  unit: string;
  targetValue: number;
  color: string;
  startedOn: string;
}) {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${habits.sortOrder}), -1)` })
    .from(habits)
    .where(eq(habits.userId, input.userId));

  const [row] = await db
    .insert(habits)
    .values({ ...input, sortOrder: max + 1 })
    .returning();
  return row;
}

/** Hard delete. Entries cascade via the FK, so this is a single statement. */
export async function deleteHabit(userId: string, habitId: string) {
  await db
    .delete(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
}
