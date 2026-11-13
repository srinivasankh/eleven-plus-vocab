"use client";

import { useEffect, useState } from "react";

/** False during server rendering and hydration; true once running in the browser. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
