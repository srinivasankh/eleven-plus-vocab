import { QuizMission } from "@/components/QuizMission";
import { getProgressSnapshot } from "@/server/progress";
import { requireChild } from "@/server/session";

export default async function QuizPage() {
  const { child } = await requireChild("/quiz");
  const { preferredQuizLength } = await getProgressSnapshot(child.id);
  return <QuizMission childId={child.id} initialQuizLength={preferredQuizLength} />;
}
