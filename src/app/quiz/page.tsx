import { QuizMission } from "@/components/QuizMission";
import { requireChild } from "@/server/session";

export default async function QuizPage() {
  await requireChild("/quiz");
  return <QuizMission />;
}
