import { NextResponse } from "next/server";
import { createHabit, currentUser, listHabits } from "@/server/repo";
import { todayIn } from "@/domain/calendar";

export async function GET() {
  const user = await currentUser();
  const habits = await listHabits(user.id);
  return NextResponse.json({
    habits,
    user: { timezone: user.timezone, weekStart: user.weekStart },
    today: todayIn(user.timezone),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  const body = await req.json();

  const name = String(body.name ?? "").trim();
  const targetValue = Number(body.targetValue);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    return NextResponse.json(
      { error: "targetValue must be a positive number" },
      { status: 400 },
    );
  }

  const habit = await createHabit({
    userId: user.id,
    name,
    unit: String(body.unit ?? "times"),
    targetValue,
    color: String(body.color ?? "#7FC7EC"),
    startedOn: String(body.startedOn ?? todayIn(user.timezone)),
  });

  return NextResponse.json({ habit }, { status: 201 });
}
