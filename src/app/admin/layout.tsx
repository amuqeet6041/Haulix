import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Admin area shell. No marketing navbar or footer, never indexed.
 * Pages under (protected) check admin access on the server for every request.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | HAULIX Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
}
