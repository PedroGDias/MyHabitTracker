import { redirect } from "next/navigation";
import { todayIn } from "@/domain/calendar";
import { currentUser } from "@/server/repo";

export default async function ReviewIndex() {
  const user = await currentUser();
  redirect(`/review/${todayIn(user.timezone).slice(0, 4)}`);
}
