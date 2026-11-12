import { QuizMission } from "@/components/QuizMission";
import { getProgressSnapshot } from "@/server/progress";
import { getActiveQuiz } from "@/server/quiz";
import { requireChild } from "@/server/session";

export default async function QuizPage() {
  const { child } = await requireChild("/quiz");
  const [{ preferredQuizLength }, activeQuiz] = await Promise.all([
    getProgressSnapshot(child.id),
    getActiveQuiz(child.id),
  ]);
  return <QuizMission activeQuiz={activeQuiz} initialQuizLength={preferredQuizLength} key={child.id} />;
}
