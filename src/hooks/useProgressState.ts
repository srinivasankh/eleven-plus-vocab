"use client";

import { useEffect, useState } from "react";
import { loadProgressState, saveProgressState } from "@/lib/storage";
import { ProgressState } from "@/lib/types";

export function useProgressState() {
  const [progress, setProgress] = useState<ProgressState | null>(null);

  useEffect(() => {
    setProgress(loadProgressState());
  }, []);

  useEffect(() => {
    if (!progress) return;
    saveProgressState(progress);
  }, [progress]);

  return { progress, setProgress };
}
