"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GENERIC_SIGN_IN_ERROR,
  NETWORK_ERROR,
  ORIGIN_ERROR,
  RATE_LIMITED_ERROR,
  UNAVAILABLE_ERROR,
} from "@/content/admin-login";
import { adminLoginSchema, type AdminLoginData, type AdminLoginInput } from "@/validations";

/**
 * Admin sign-in. Posts to Better Auth (/api/auth/sign-in/email, which applies
 * its sign-in rate limit), then confirms admin access with /api/admin/me.
 *
 * Every failure that could hint at whether an account exists, is an admin, or
 * is banned shows the same message. A signed-in non-admin is signed out again.
 */

interface AdminLoginFormProps {
  /** Message shown above the form when redirected here (see LOGIN_NOTICES). */
  notice?: string;
}

async function signOutQuietly() {
  try {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    // Best effort: the server guard still refuses the session on every request.
  }
}

export function AdminLoginForm({ notice }: AdminLoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginInput, unknown, AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: AdminLoginData) {
    setSubmitting(true);
    setError(null);
    try {
      const signIn = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      if (signIn.status === 429) return setError(RATE_LIMITED_ERROR);
      if (signIn.status === 503) return setError(UNAVAILABLE_ERROR);
      if (!signIn.ok) {
        const failure = (await signIn.json().catch(() => null)) as { code?: unknown } | null;
        return setError(failure?.code === "INVALID_ORIGIN" ? ORIGIN_ERROR : GENERIC_SIGN_IN_ERROR);
      }

      const me = await fetch("/api/admin/me", { cache: "no-store" });
      if (me.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      await signOutQuietly();
      setError(me.status === 503 ? UNAVAILABLE_ERROR : GENERIC_SIGN_IN_ERROR);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" aria-busy={submitting}>
      {notice && !error ? (
        <p role="status" className="rounded-xl border border-orange/30 bg-surface p-4 text-sm">
          {notice}
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-surface p-4 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <FormField id="admin-email" label="Email" required error={errors.email?.message}>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "admin-email-message" : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField id="admin-password" label="Password" required error={errors.password?.message}>
        <div className="relative">
          <Input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "admin-password-message" : undefined}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls="admin-password"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </FormField>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
