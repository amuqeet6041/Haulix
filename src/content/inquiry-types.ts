/**
 * Topics a visitor can pick on the contact form. Values must match the
 * `InquiryType` enum in prisma/schema.prisma (a unit test checks this).
 * Labels are customer-facing; keep them short and natural.
 */
export const inquiryTypes = [
  { value: "GENERAL", label: "General question" },
  { value: "DISPATCH_SERVICES", label: "Dispatch services" },
  { value: "PRICING", label: "Pricing" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "OTHER", label: "Something else" },
] as const;

export type InquiryTypeValue = (typeof inquiryTypes)[number]["value"];

export const inquiryTypeValues = inquiryTypes.map((item) => item.value) as [
  InquiryTypeValue,
  ...InquiryTypeValue[],
];

/** Default used by the current contact form until it shows a topic picker. */
export const defaultInquiryType: InquiryTypeValue = "GENERAL";

export function inquiryTypeLabel(value: InquiryTypeValue): string {
  return inquiryTypes.find((item) => item.value === value)?.label ?? value;
}
