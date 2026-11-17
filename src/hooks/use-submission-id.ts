"use client";

import { useCallback, useRef } from "react";

import { newSubmissionId } from "@/lib/submission";

/**
 * One idempotency key per submission attempt. `get()` returns the same key
 * until `renew()` is called after a successful submission, so a retry of the
 * same attempt (after a network error or a lost response) is stored only once.
 */
export function useSubmissionId() {
  const key = useRef<string | undefined>(undefined);

  const get = useCallback(() => {
    key.current ??= newSubmissionId();
    return key.current;
  }, []);

  const renew = useCallback(() => {
    key.current = undefined;
  }, []);

  return { get, renew };
}
