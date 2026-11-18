import { revalidatePath } from "next/cache";

import { logServerWarning } from "@/lib/log";

/**
 * Refreshes the cached admin pages that show lead data (dashboard, list and
 * detail) after a change. The change is already saved when this runs, so a
 * failure here is logged and never turned into an error response.
 */
export function revalidateLeadPages() {
  try {
    revalidatePath("/admin");
    revalidatePath("/admin/leads");
    revalidatePath("/admin/leads/[id]", "page");
  } catch {
    logServerWarning("admin-leads", "Could not refresh cached lead pages.");
  }
}
