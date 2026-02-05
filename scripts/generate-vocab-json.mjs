import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "Y5_set01_to_24.md");
const outputPath = path.join(root, "src", "data", "vocab.generated.json");

function splitList(value) {
  if (!value || value.includes("(no direct antonyms)")) return [];
  return value
    .split(/,|\//)
    .map((item) => item.trim())
    .filter(Boolean);
}

function captureField(block, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\*\\*${escaped}:\\*\\*\\s+([^\\n]+)`);
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

function captureExamples(block) {
  const section = block.split("**Example Sentences:**")[1];
  if (!section) return [];
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, "").trim());
}

function buildSetLookup(markdown) {
  const lookup = [];
  const lines = markdown.split("\n");
  lines.forEach((line, idx) => {
    const match = line.match(/^#\s+Set\s+(\d+)\s+Vocabulary\s+List\s*$/);
    if (match) lookup.push({ line: idx + 1, setNumber: Number(match[1]) });
  });
  return lookup;
}

function setForLine(line, lookup) {
  let found = null;
  for (const item of lookup) {
    if (item.line <= line) found = item.setNumber;
  }
  return found;
}

function parseMarkdown(markdown) {
  const warnings = [];
  const entries = [];
  const lines = markdown.split("\n");
  const setLookup = buildSetLookup(markdown);
  const headingRegex = /^##\s+(\d+)\.\s+(.+)$/gm;
  const matches = [...markdown.matchAll(headingRegex)];

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const id = Number(match[1]);
    const word = match[2].trim();
    const blockStart = match.index ?? 0;
    const blockEnd = i + 1 < matches.length ? (matches[i + 1].index ?? markdown.length) : markdown.length;
    const block = markdown.slice(blockStart, blockEnd);
    const headingLine = lines.slice(0, blockStart).length;

    const type = captureField(block, "Type") ?? "";
    const meaning = captureField(block, "Meaning") ?? "";
    const synonyms = splitList(captureField(block, "Synonyms") ?? "");
    const antonyms = splitList(captureField(block, "Antonyms") ?? "");
    const examples = captureExamples(block);

    if (!word || !type || !meaning || synonyms.length === 0 || examples.length === 0) {
      warnings.push({ line: headingLine, entryId: id, reason: "Missing required fields" });
      continue;
    }

    entries.push({ id, setNumber: setForLine(headingLine, setLookup), word, type, meaning, synonyms, antonyms, examples });
  }

  const ids = entries.map((item) => item.id).sort((a, b) => a - b);
  if (ids.length > 0) {
    for (let i = ids[0]; i <= ids[ids.length - 1]; i += 1) {
      if (!ids.includes(i)) warnings.push({ entryId: i, reason: "Missing sequence id" });
    }
  }

  return {
    entries,
    warnings,
    stats: {
      totalBlocks: matches.length,
      valid: entries.length,
      invalid: matches.length - entries.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source file not found at ${sourcePath}`);
}

const markdown = fs.readFileSync(sourcePath, "utf8");
const parsed = parseMarkdown(markdown);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
console.log(`[generate-vocab-json] wrote ${parsed.entries.length} entries with ${parsed.warnings.length} warnings.`);
