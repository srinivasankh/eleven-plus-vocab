import { HomeDashboard } from "@/components/HomeDashboard";
import { getProgressSnapshot } from "@/server/progress";
import { getActiveChild } from "@/server/session";

export default async function HomePage() {
  const child = await getActiveChild();
  const snapshot = child ? await getProgressSnapshot(child.id) : null;

  return (
    <HomeDashboard
      learner={
        child && snapshot
          ? {
              id: child.id,
              name: child.displayName,
              learnedCount: snapshot.learnedHeadwords.length,
              attempts: snapshot.attempts,
              latest: snapshot.recentResults[0] ?? null,
              hasActiveQuiz: snapshot.hasActiveQuiz,
            }
          : null
      }
    />
  );
}
