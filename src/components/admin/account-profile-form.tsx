"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { adminFetch } from "@/lib/admin-fetch";
import type { AccountProfile } from "@/types/account";
import { accountProfileSchema, ACCOUNT_NAME_MAX } from "@/validations/admin-account";

/**
 * Profile: the display name is editable; email and role are shown but cannot
 * be changed here (email changes are disabled in the authentication setup, and
 * roles can never be changed by the account holder). Saving is explicit.
 */
export function AccountProfileForm({ profile }: { profile: AccountProfile }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState(profile.name);
  const [name, setName] = useState(profile.name);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  // Follow the server's name after a refresh.
  const [seen, setSeen] = useState(profile.name);
  if (profile.name !== seen) {
    setSeen(profile.name);
    setSaved(profile.name);
    setName(profile.name);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = accountProfileSchema.safeParse({ name });
    if (!parsed.success) {
      setProblem(parsed.error.issues[0]?.message ?? "Please check your name.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const result = await adminFetch("PATCH", "/api/admin/account/profile", parsed.data);
      if (result.kind === "ok") {
        setSaved(parsed.data.name);
        setName(parsed.data.name);
        toast.success("Profile updated", "Your name was saved.");
        // The header and sidebar show the name too, so refresh the server data.
        startTransition(() => router.refresh());
      } else {
        setProblem(result.message);
        toast.error("Profile not updated", result.message);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const unchanged = name.trim() === saved;

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            name="name"
            className="mt-1.5"
            autoComplete="name"
            value={name}
            maxLength={ACCOUNT_NAME_MAX + 20}
            disabled={busy}
            onChange={(event) => {
              setName(event.target.value);
              if (problem) setProblem(null);
            }}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? "account-name-error" : undefined}
          />
          {problem ? (
            <p id="account-name-error" role="alert" className="mt-1.5 text-sm text-destructive">
              {problem}
            </p>
          ) : null}
        </div>

        <dl className="contents">
          <div>
            <dt className="label-caps text-gray">Email</dt>
            <dd className="mt-1 [overflow-wrap:anywhere] text-foreground">
              {profile.email}
              <span className="mt-1 block text-xs text-gray">
                Your email is your sign-in and cannot be changed here.
              </span>
            </dd>
          </div>
          <div>
            <dt className="label-caps text-gray">Role</dt>
            <dd className="mt-1 text-foreground">
              Administrator
              <span className="mt-1 block text-xs text-gray">
                Roles are managed by the site owner.
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <Button type="submit" className="mt-6" disabled={busy || unchanged}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
