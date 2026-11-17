"use client";

import { useCallback, useState } from "react";

import type { ApiResponse } from "@/types/api";

type Status = "idle" | "submitting" | "success" | "error";

interface PostJsonState {
  status: Status;
  message: string;
}

/** Posts JSON to one of our API routes and tracks the submit state for the form UI. */
export function usePostJson(endpoint: string) {
  const [state, setState] = useState<PostJsonState>({ status: "idle", message: "" });

  const submit = useCallback(
    async (payload: unknown): Promise<boolean> => {
      setState({ status: "submitting", message: "" });
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as ApiResponse;
        setState({ status: body.ok ? "success" : "error", message: body.message });
        return body.ok;
      } catch {
        setState({
          status: "error",
          message: "We could not reach the server. Check your connection and try again.",
        });
        return false;
      }
    },
    [endpoint],
  );

  const reset = useCallback(() => setState({ status: "idle", message: "" }), []);

  return { ...state, submit, reset };
}
