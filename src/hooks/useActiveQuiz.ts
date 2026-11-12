"use client";

import { useCallback, useEffect, useState } from "react";
import { ActiveQuiz, loadActiveQuiz, saveActiveQuiz } from "@/lib/storage";

/** The child's saved, unfinished quiz on this device (if any). `null` = no active child. */
export function useActiveQuiz(childId: string | null) {
  const [activeQuiz, setState] = useState<ActiveQuiz | undefined>(undefined);

  useEffect(() => {
    setState(childId ? loadActiveQuiz(childId) : undefined);
  }, [childId]);

  const setActiveQuiz = useCallback(
    (quiz: ActiveQuiz | undefined) => {
      setState(quiz);
      if (childId) saveActiveQuiz(childId, quiz);
    },
    [childId],
  );

  return { activeQuiz, setActiveQuiz };
}
