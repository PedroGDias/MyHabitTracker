import { NextResponse } from "next/server";
import { currentUser, deleteHabit } from "@/server/repo";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  await deleteHabit(user.id, id);
  return NextResponse.json({ ok: true });
}
