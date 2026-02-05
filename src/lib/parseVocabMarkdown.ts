import { ParseResult, ParseWarning, VocabEntry } from "@/lib/types";

const headingRegex = /^##\s+(\d+)\.\s+(.+)$/gm;
const setRegex = /^#\s+Set\s+(\d+)\s+Vocabulary\s+List\s*$/gm;

function splitList(value: string): string[] {
  if (!value || value.includes("(no direct antonyms)")) {
    return [];
  }

  return value
    .split(/,|\//)
    .map((item) => item.trim())
    .filter(Boolean);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function captureField(block: string, label: string): string | null {
  const regex = new RegExp(`\\*\\*${escapeRegExp(label)}:\\*\\*\\s+([^\\n]+)`);
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function captureExamples(block: string): string[] {
  const section = block.split("**Example Sentences:**")[1];
  if (!section) {
    return [];
  }

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line));

  return lines.map((line) => line.replace(/^\d+\.\s+/, "").trim());
}

function buildSetLookup(markdown: string): Array<{ line: number; setNumber: number }> {
  const result: Array<{ line: number; setNumber: number }> = [];
  const lines = markdown.split("\n");

  lines.forEach((line, index) => {
    const match = line.match(/^#\s+Set\s+(\d+)\s+Vocabulary\s+List\s*$/);
    if (match) {
      result.push({ line: index + 1, setNumber: Number(match[1]) });
    }
  });

  return result;
}

function setForLine(
  line: number,
  lookup: Array<{ line: number; setNumber: number }>,
): number | null {
  let found: number | null = null;

  for (const item of lookup) {
    if (item.line <= line) {
      found = item.setNumber;
    }
  }

  return found;
}

function validateEntry(entry: VocabEntry): string | null {
  if (!entry.word || !entry.type || !entry.meaning) {
    return "Missing required textual fields";
  }

  if (entry.synonyms.length === 0) {
    return "Missing synonyms";
  }

  if (entry.examples.length === 0) {
    return "Missing example sentences";
  }

  return null;
}

export function parseVocabMarkdown(markdown: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const entries: VocabEntry[] = [];

  const lines = markdown.split("\n");
  const setLookup = buildSetLookup(markdown);

  const setMatches = [...markdown.matchAll(setRegex)];
  if (setMatches.length === 0) {
    warnings.push({ reason: "No set headers found" });
  }

  const headingMatches = [...markdown.matchAll(headingRegex)];

  for (let index = 0; index < headingMatches.length; index += 1) {
    const match = headingMatches[index];
    const id = Number(match[1]);
    const word = match[2].trim();
    const blockStart = match.index ?? 0;
    const blockEnd =
      index + 1 < headingMatches.length
        ? (headingMatches[index + 1].index ?? markdown.length)
        : markdown.length;

    const block = markdown.slice(blockStart, blockEnd);
    const headingLine = lines.slice(0, blockStart).length;

    const type = captureField(block, "Type");
    const meaning = captureField(block, "Meaning");
    const synonyms = splitList(captureField(block, "Synonyms") ?? "");
    const antonyms = splitList(captureField(block, "Antonyms") ?? "");
    const examples = captureExamples(block);

    const entry: VocabEntry = {
      id,
      setNumber: setForLine(headingLine, setLookup),
      word,
      type: type ?? "",
      meaning: meaning ?? "",
      synonyms,
      antonyms,
      examples,
    };

    const error = validateEntry(entry);
    if (error) {
      warnings.push({ line: headingLine, reason: error, entryId: id });
      continue;
    }

    entries.push(entry);
  }

  const ids = entries.map((entry) => entry.id).sort((a, b) => a - b);
  if (ids.length > 0) {
    for (let id = ids[0]; id <= ids[ids.length - 1]; id += 1) {
      if (!ids.includes(id)) {
        warnings.push({ reason: "Missing sequence id", entryId: id });
      }
    }
  }

  const stats = {
    totalBlocks: headingMatches.length,
    valid: entries.length,
    invalid: headingMatches.length - entries.length,
  };

  return { entries, warnings, stats };
}
