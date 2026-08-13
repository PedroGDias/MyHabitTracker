"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Entry, Habit } from "@/domain/types";

export interface HabitsResponse {
  habits: Habit[];
  user: { timezone: string; weekStart: number };
  today: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  return res.json();
}

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: () => fetch("/api/habits").then(json<HabitsResponse>),
  });
}

export function useEntries(from?: string, to?: string) {
  return useQuery({
    queryKey: ["entries", from, to],
    enabled: Boolean(from && to),
    queryFn: () =>
      fetch(`/api/entries?from=${from}&to=${to}`).then(
        json<{ entries: Entry[] }>,
      ),
  });
}

/**
 * Optimistic: the cache is written before the request goes out, so a tap
 * registers instantly and rolls back only if the server rejects it.
 */
export function useSetEntry(from?: string, to?: string) {
  const qc = useQueryClient();
  const key = ["entries", from, to];

  return useMutation({
    mutationFn: (v: { habitId: string; onDate: string; value: number }) =>
      fetch("/api/entries", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      }).then(json<{ ok: true }>),

    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<{ entries: Entry[] }>(key);

      qc.setQueryData<{ entries: Entry[] }>(key, (old) => {
        const rest =
          old?.entries.filter(
            (e) => !(e.habitId === v.habitId && e.onDate === v.onDate),
          ) ?? [];
        return { entries: v.value > 0 ? [...rest, v] : rest };
      });

      return { previous };
    },

    onError: (_err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      fetch("/api/habits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }).then(json<{ habit: Habit }>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) =>
      fetch(`/api/habits/${habitId}`, { method: "DELETE" }).then(json<{ ok: true }>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}
