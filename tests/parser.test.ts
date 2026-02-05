import { describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";

const sample = `# Set 1 Vocabulary List

## 1. Brave

**Type:** Adjective

**Meaning:** showing courage

**Synonyms:** bold, courageous

**Antonyms:** timid, fearful

**Example Sentences:**
1. She was brave.

## 3. Rapid

**Type:** Adjective

**Meaning:** very fast

**Synonyms:** quick, swift

**Antonyms:** slow

**Example Sentences:**
1. The rapid stream moved quickly.
`;

describe("parseVocabMarkdown", () => {
  it("parses valid entries and captures a missing sequence id warning", () => {
    const result = parseVocabMarkdown(sample);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].word).toBe("Brave");
    expect(result.warnings.some((item) => item.entryId === 2)).toBe(true);
  });

  it("skips malformed entries that miss required fields", () => {
    const malformed = `## 1. Broken\n\n**Meaning:** only meaning\n`;
    const result = parseVocabMarkdown(malformed);
    expect(result.entries).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
