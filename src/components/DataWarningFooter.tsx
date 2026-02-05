import { getDataWarningsCount } from "@/lib/vocabData";

export function DataWarningFooter() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const warnings = getDataWarningsCount();
  if (warnings === 0) {
    return null;
  }

  return <p className="data-warning">Data warnings: {warnings} skipped/flagged entries detected during import.</p>;
}
