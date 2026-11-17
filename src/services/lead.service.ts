import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { ServiceResult } from "@/types/api";
import type { LeadData } from "@/validations";

import { sendLeadNotification } from "./email.service";

async function storeLead(lead: LeadData): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    await getPrisma().lead.create({
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
    });
    return true;
  } catch (error) {
    console.error("[lead] Failed to store lead:", error);
    return false;
  }
}

/**
 * Handles a validated carrier inquiry: store it and notify the team.
 * Succeeds when at least one of the two worked, so a lead is never silently lost.
 */
export async function submitLead(lead: LeadData): Promise<ServiceResult> {
  const [stored, notified] = await Promise.all([storeLead(lead), sendLeadNotification(lead)]);

  if (stored || notified) return { ok: true };

  const anythingConfigured = isDatabaseConfigured() || Boolean(process.env.RESEND_API_KEY);
  return { ok: false, reason: anythingConfigured ? "failed" : "not_configured" };
}
