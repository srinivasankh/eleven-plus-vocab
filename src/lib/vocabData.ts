import rawData from "@/data/vocab.generated.json";
import { GeneratedVocabData, VocabEntry } from "@/lib/types";

const data = rawData as GeneratedVocabData;

if (process.env.NODE_ENV !== "production" && data.warnings.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(`[vocab] ${data.warnings.length} warnings while parsing source markdown.`, data.warnings);
}

export function getVocabEntries(): VocabEntry[] {
  return data.entries;
}

export function getDataWarningsCount(): number {
  return data.warnings.length;
}

export function getDataStats() {
  return data.stats;
}
