import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Logo } from "@/components/shared/logo";
import { LOGIN_NOTICES } from "@/content/admin-login";
import { ADMIN_HOME_PATH, getAdminForRequest } from "@/lib/admin-page";

export const metadata: Metadata = { title: "Sign in" };

interface AdminLoginPageProps {
  searchParams: Promise<{ reason?: string | string[] }>;
}

/** /admin/login. Already signed-in admins go straight to the dashboard. */
export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const current = await getAdminForRequest();
  if (current.ok) redirect(ADMIN_HOME_PATH);

  const { reason } = await searchParams;
  const notice = typeof reason === "string" ? LOGIN_NOTICES[reason] : undefined;

  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo preload />
        </div>
        <div className="rounded-panel card-surface p-7 shadow-lift sm:p-9">
          <p className="label-caps text-orange">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Sign in</h1>
          <p className="mt-2 mb-7 text-sm text-gray">
            For HAULIX staff. Sign in with your admin email and password.
          </p>
          <AdminLoginForm notice={notice} />
        </div>
      </div>
    </main>
  );
}
