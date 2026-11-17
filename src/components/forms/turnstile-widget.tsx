"use client";

import { useEffect, useRef } from "react";

import { getTurnstileSiteKey, isTurnstileEnabled, TURNSTILE_SCRIPT_URL } from "@/lib/turnstile";

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme?: "dark" | "light" | "auto";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface TurnstileWidgetProps {
  /** Receives a fresh token, or "" when it expires or fails. */
  onToken: (token: string) => void;
  /** Change this value to get a new token (tokens are single use). */
  resetKey?: number;
}

/**
 * Cloudflare Turnstile challenge. Renders nothing unless Turnstile is enabled
 * (see lib/turnstile.ts), so the forms look and behave exactly as before by default.
 */
export function TurnstileWidget({ onToken, resetKey = 0 }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const enabled = isTurnstileEnabled();

  useEffect(() => {
    if (!enabled || !container.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: getTurnstileSiteKey(),
          theme: "dark",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(() => onToken(""));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [enabled, onToken]);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onToken("");
    }
  }, [resetKey, onToken]);

  if (!enabled) return null;
  return <div ref={container} className="min-h-16" />;
}
