"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Measures how long a form has been open, for the server's minimum fill time
 * check. Starts on mount (never during server rendering) and restarts after a
 * successful submission.
 */
export function useFormTimer() {
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const elapsed = useCallback(
    () => (startedAt.current === null ? 0 : Date.now() - startedAt.current),
    [],
  );
  const restart = useCallback(() => {
    startedAt.current = Date.now();
  }, []);

  return { elapsed, restart };
}
