"use client";

import { LogOut, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { LocalTime } from "@/components/admin/local-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { adminFetch, authFetch } from "@/lib/admin-fetch";
import type { AccountSession } from "@/types/account";

/**
 * The admin's active sessions, with a way to end any other one, and "Sign out
 * everywhere", which uses Better Auth's own revoke-sessions endpoint (it ends
 * every session, this one included) and then returns to the sign-in page.
 */

export const SESSION_MESSAGES = {
  revokeFailed: "We could not end that session. Please try again.",
  signOutFailed: "We could not sign you out everywhere. Please try again.",
  network: "We could not reach the server. Check your connection and try again.",
} as const;

const LOGIN = "/admin/login";

export function AccountSessions({ sessions }: { sessions: AccountSession[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<AccountSession | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const inFlight = useRef(false);
  const signOutAllRef = useRef<HTMLButtonElement>(null);
  // After a session row is removed its button is gone, so focus goes to a stable control.
  const rowRemoved = useRef(false);

  async function confirmRevoke() {
    if (!revoking || inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await adminFetch(
        "DELETE",
        `/api/admin/account/sessions/${encodeURIComponent(revoking.id)}`,
      );
      if (result.kind === "ok" || (result.kind === "error" && result.status === 404)) {
        // Ended now, or already gone: either way it is no longer active.
        rowRemoved.current = true;
        toast.success("Session ended", `${revoking.device} was signed out.`);
        startTransition(() => router.refresh());
        return;
      }
      toast.error("Session not ended", result.message);
      throw new Error("revoke failed");
    } finally {
      inFlight.current = false;
    }
  }

  async function confirmSignOutEverywhere() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await authFetch("/revoke-sessions", {});
      if (result.ok) {
        // Every session is gone, this one included. Go to sign-in.
        router.replace(LOGIN);
        router.refresh();
        return;
      }
      toast.error(
        "Not signed out",
        "network" in result ? SESSION_MESSAGES.network : SESSION_MESSAGES.signOutFailed,
      );
      throw new Error("sign out everywhere failed");
    } finally {
      inFlight.current = false;
    }
  }

  const others = sessions.filter((session) => !session.current).length;

  return (
    <div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {sessions.map((session, index) => (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <Monitor className="mt-0.5 size-5 shrink-0 text-gray" aria-hidden="true" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                  {session.device}
                  {session.current ? (
                    <Badge tone="accent" dot>
                      This device
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-gray">
                  Signed in <LocalTime iso={session.createdAt} />
                </p>
                <p className="text-xs text-gray">
                  Last active <LocalTime iso={session.lastActiveAt} />
                </p>
              </div>
            </div>
            {session.current ? null : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                aria-label={`Sign out ${session.device}, session ${index + 1}`}
                onClick={() => setRevoking(session)}
              >
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          ref={signOutAllRef}
          type="button"
          variant="secondary"
          onClick={() => setSigningOut(true)}
        >
          <LogOut aria-hidden="true" />
          Sign out everywhere
        </Button>
        <p className="text-xs text-gray">
          {others === 0
            ? "You are signed in on this device only."
            : `You are signed in on ${others} other ${others === 1 ? "device" : "devices"}.`}
        </p>
      </div>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) setRevoking(null);
        }}
        title="Sign out this device?"
        description={
          revoking
            ? `${revoking.device} will be signed out and will need your password to get back in.`
            : ""
        }
        confirmLabel="Sign out device"
        tone="destructive"
        onConfirm={confirmRevoke}
        returnFocus={() => {
          const removed = rowRemoved.current;
          rowRemoved.current = false;
          return removed ? signOutAllRef.current : undefined;
        }}
      />

      <ConfirmDialog
        open={signingOut}
        onOpenChange={setSigningOut}
        title="Sign out everywhere?"
        description="This ends every session on every device, including this one. You will be taken to the sign-in page and will need your password to sign in again."
        confirmLabel="Sign out everywhere"
        tone="destructive"
        onConfirm={confirmSignOutEverywhere}
      />
    </div>
  );
}
