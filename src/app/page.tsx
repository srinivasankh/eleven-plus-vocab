import { HomeDashboard } from "@/components/HomeDashboard";
import { getProgressSnapshot } from "@/server/progress";
import { getActiveChild, getParent } from "@/server/session";

export default async function HomePage() {
  const [parent, child] = await Promise.all([getParent(), getActiveChild()]);
  const snapshot = child ? await getProgressSnapshot(child.id) : null;

  return (
    <HomeDashboard
      signedIn={parent !== null}
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
