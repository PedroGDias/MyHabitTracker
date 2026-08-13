import { NextResponse } from "next/server";
import { currentUser, listEntries, setEntry } from "@/server/repo";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const user = await currentUser();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return NextResponse.json(
      { error: "from and to are required as YYYY-MM-DD" },
      { status: 400 },
    );
  }

  return NextResponse.json({ entries: await listEntries(user.id, from, to) });
}

export async function PUT(req: Request) {
  await currentUser();
  const body = await req.json();

  const habitId = String(body.habitId ?? "");
  const onDate = String(body.onDate ?? "");
  const value = Number(body.value);

  if (!habitId || !ISO_DATE.test(onDate)) {
    return NextResponse.json(
      { error: "habitId and onDate (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json(
      { error: "value must be a non-negative number" },
      { status: 400 },
    );
  }

  await setEntry(habitId, onDate, value);
  return NextResponse.json({ ok: true });
}
