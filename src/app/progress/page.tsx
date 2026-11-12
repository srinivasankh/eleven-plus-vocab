import { ProgressDashboard } from "@/components/ProgressDashboard";
import { requireChild } from "@/server/session";

export default async function ProgressPage() {
  await requireChild("/progress");
  return <ProgressDashboard />;
}
