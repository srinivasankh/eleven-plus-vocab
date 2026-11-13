import { ProgressDashboard } from "@/components/ProgressDashboard";
import { getProgressSnapshot } from "@/server/progress";
import { requireChild } from "@/server/session";

export default async function ProgressPage() {
  const { child } = await requireChild("/progress");
  const snapshot = await getProgressSnapshot(child.id);
  return <ProgressDashboard childName={child.displayName} snapshot={snapshot} />;
}
