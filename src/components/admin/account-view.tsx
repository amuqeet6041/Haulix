import type { ReactNode } from "react";

import { AccountPasswordForm } from "@/components/admin/account-password-form";
import { AccountProfileForm } from "@/components/admin/account-profile-form";
import { AccountSessions } from "@/components/admin/account-sessions";
import { ErrorNotice } from "@/components/admin/error-notice";
import { LocalTime } from "@/components/admin/local-time";
import type { AccountResult } from "@/services/admin-account.service";
import type { AccountProfile, AccountSession } from "@/types/account";

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-2xl card-surface p-5 sm:p-6">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-gray">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const LOAD_ERROR = "We could not load this. Please refresh the page to try again.";

/**
 * Body of /admin/account. Server component: it renders what the page already
 * loaded. Each section fails on its own, so a problem listing sessions does not
 * hide the password form.
 */
export function AccountView({
  profile,
  sessions,
}: {
  profile: AccountResult<AccountProfile>;
  sessions: AccountResult<AccountSession[]>;
}) {
  return (
    <div className="space-y-6">
      <Section
        id="profile-heading"
        title="Profile"
        description="Your name appears in the admin header and on notes and activity you create."
      >
        {profile.ok ? (
          <>
            <AccountProfileForm profile={profile.data} />
            <p className="mt-6 border-t border-border pt-4 text-xs text-gray">
              Account created <LocalTime iso={profile.data.memberSince} />
            </p>
          </>
        ) : (
          <ErrorNotice title="Profile unavailable">{LOAD_ERROR}</ErrorNotice>
        )}
      </Section>

      <Section
        id="password-heading"
        title="Password"
        description="Use a password you do not use anywhere else."
      >
        <AccountPasswordForm />
      </Section>

      <Section
        id="sessions-heading"
        title="Where you are signed in"
        description="These devices can use your account right now. Sign out any you do not recognize."
      >
        {sessions.ok ? (
          <AccountSessions sessions={sessions.data} />
        ) : (
          <ErrorNotice title="Sessions unavailable">{LOAD_ERROR}</ErrorNotice>
        )}
      </Section>
    </div>
  );
}
