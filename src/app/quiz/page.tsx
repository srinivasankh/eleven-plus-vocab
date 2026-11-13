import { QuizMission } from "@/components/QuizMission";
import { getProgressSnapshot } from "@/server/progress";
import { getActiveQuiz } from "@/server/quiz";
import { requireChild } from "@/server/session";

type Props = { searchParams: Promise<{ mode?: string }> };

export default async function QuizPage({ searchParams }: Props) {
  const { child } = await requireChild("/quiz");
  const resume = (await searchParams).mode === "resume";
  const [{ preferredQuizLength }, activeQuiz] = await Promise.all([
    getProgressSnapshot(child.id),
    getActiveQuiz(child.id),
  ]);
  return (
    <QuizMission
      activeQuiz={activeQuiz}
      initialQuizLength={preferredQuizLength}
      key={child.id}
      resumeOnOpen={resume}
    />
  );
}
