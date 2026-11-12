import { LearnDeck } from "@/components/LearnDeck";
import { getProgressSnapshot } from "@/server/progress";
import { requireChild } from "@/server/session";
import { getAllWords } from "@/server/vocab";

// Words come from the database at request time, not at build time.
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const { child } = await requireChild("/learn");
  const [entries, snapshot] = await Promise.all([getAllWords(), getProgressSnapshot(child.id)]);
  return <LearnDeck entries={entries} initialLearned={snapshot.learnedHeadwords} key={child.id} />;
}
