import { LearnDeck } from "@/components/LearnDeck";
import { requireChild } from "@/server/session";
import { getAllWords } from "@/server/vocab";

// Words come from the database at request time, not at build time.
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  await requireChild("/learn");
  const entries = await getAllWords();
  return <LearnDeck entries={entries} />;
}
