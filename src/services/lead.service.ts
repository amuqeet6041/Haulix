import { logServerError } from "@/lib/log";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ServiceResult } from "@/types/api";
import type { LeadData } from "@/validations";

import { reportNotificationOutcome, sendLeadNotification } from "./email.service";

/** Stores the lead and returns its id, or null when the write failed. */
async function storeLead(lead: LeadData): Promise<string | null> {
  try {
    const created = await getPrisma().lead.create({
      data: {
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName ?? null,
        mcNumber: lead.mcNumber ?? null,
        dotNumber: lead.dotNumber ?? null,
        equipment: lead.equipment,
        truckCount: lead.truckCount,
        preferredLanes: lead.preferredLanes ?? null,
        message: lead.message ?? null,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    logServerError("lead", "Failed to store lead", error);
    return null;
  }
}

/**
 * Handles a validated carrier inquiry. The database is the source of truth:
 * the submission succeeds only once the lead is stored. The team notification
 * is sent afterwards; if it fails, the stored lead is kept and the failure is
 * logged, so nothing is lost and the visitor is not asked to resubmit.
 */
export async function submitLead(lead: LeadData): Promise<ServiceResult> {
  if (!isDatabaseConfigured()) return { ok: false, reason: "not_configured" };

  const leadId = await storeLead(lead);
  if (!leadId) return { ok: false, reason: "failed" };

  reportNotificationOutcome("lead", leadId, await sendLeadNotification(lead));
  return { ok: true };
}
