"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { authFetch } from "@/lib/admin-fetch";
import {
  ACCOUNT_PASSWORD_MAX,
  ACCOUNT_PASSWORD_MIN,
  firstErrors,
  passwordChangeSchema,
} from "@/validations/admin-account";

/**
 * Change password. The browser sends the passwords straight to Better Auth's
 * change-password endpoint, which verifies the current password, hashes the
 * new one and (here) signs out every other device. Nothing about the passwords
 * is stored in the page, logged, or sent to our own API.
 */

export const PASSWORD_MESSAGES = {
  wrongCurrent: "Your current password is incorrect.",
  rateLimited: "Too many attempts. Please wait a few minutes and try again.",
  network: "We could not reach the server. Check your connection and try again.",
  signedOut: "Your session has ended. Please sign in again.",
  unexpected: "We could not change your password. Please try again.",
} as const;

type Field = "currentPassword" | "newPassword" | "confirmPassword";
const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function AccountPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const set = (field: Field) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field] || errors.form) setErrors({});
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = passwordChangeSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error));
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors({});
    try {
      const result = await authFetch("/change-password", {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // End every other session: whoever else had access loses it.
        revokeOtherSessions: true,
      });
      if (result.ok) {
        setValues(empty);
        toast.success("Password changed", "Your other devices were signed out.");
        startTransition(() => router.refresh());
        return;
      }
      if ("network" in result) {
        setErrors({ form: PASSWORD_MESSAGES.network });
      } else if (result.code === "INVALID_PASSWORD") {
        setErrors({ currentPassword: PASSWORD_MESSAGES.wrongCurrent });
      } else if (result.status === 429) {
        setErrors({ form: PASSWORD_MESSAGES.rateLimited });
      } else if (result.status === 401) {
        setErrors({ form: PASSWORD_MESSAGES.signedOut });
      } else {
        setErrors({ form: PASSWORD_MESSAGES.unexpected });
      }
      toast.error("Password not changed");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const field = (id: Field, label: string, autoComplete: string, hint?: string) => {
    const message = errors[id];
    const described = [hint ? `${id}-hint` : null, message ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ");
    return (
      <div>
        <Label htmlFor={`password-${id}`}>{label}</Label>
        <Input
          id={`password-${id}`}
          name={id}
          type="password"
          className="mt-1.5"
          autoComplete={autoComplete}
          value={values[id]}
          onChange={set(id)}
          disabled={busy}
          maxLength={ACCOUNT_PASSWORD_MAX + 50}
          aria-invalid={message ? true : undefined}
          aria-describedby={described || undefined}
        />
        {hint ? (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray">
            {hint}
          </p>
        ) : null}
        {message ? (
          <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-destructive">
            {message}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-5">
      {field("currentPassword", "Current password", "current-password")}
      {field(
        "newPassword",
        "New password",
        "new-password",
        `At least ${ACCOUNT_PASSWORD_MIN} characters.`,
      )}
      {field("confirmPassword", "Confirm new password", "new-password")}

      {errors.form ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      ) : null}

      <Button type="submit" disabled={busy}>
        {busy ? "Changing…" : "Change password"}
      </Button>
      <p className="text-xs text-gray">
        Changing your password signs you out on every other device.
      </p>
    </form>
  );
}
