import { LearnDeck } from "@/components/LearnDeck";
import { getAllWords } from "@/server/vocab";

// Words come from the database at request time, not at build time.
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const entries = await getAllWords();
  return <LearnDeck entries={entries} />;
}
