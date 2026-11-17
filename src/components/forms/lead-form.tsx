"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormStatus } from "@/components/forms/form-status";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { equipmentServices } from "@/content/services";
import { usePostJson } from "@/hooks/use-post-json";
import { pickFieldErrors } from "@/lib/form-errors";
import {
  carrierInquirySchema,
  type CarrierInquiryData,
  type CarrierInquiryInput,
} from "@/validations";

/** Visible fields in form order; server field errors are mapped onto these. */
const leadFields = [
  "fullName",
  "email",
  "phone",
  "companyName",
  "mcNumber",
  "dotNumber",
  "equipment",
  "fleetSize",
  "preferredLanes",
  "message",
] as const satisfies readonly (keyof CarrierInquiryInput)[];

/** Carrier inquiry form. Validated with the same Zod schema the API route uses. */
export function LeadForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CarrierInquiryInput, unknown, CarrierInquiryData>({
    resolver: zodResolver(carrierInquirySchema),
    defaultValues: { website: "" },
  });
  const { status, message, submit } = usePostJson("/api/leads");

  async function onSubmit(data: CarrierInquiryData) {
    const result = await submit(data);
    if (result.ok) {
      reset();
      return;
    }
    pickFieldErrors(result.fieldErrors, leadFields).forEach(([field, fieldMessage], index) =>
      setError(field, { type: "server", message: fieldMessage }, { shouldFocus: index === 0 }),
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="fullName" label="Full name" required error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "fullName-message" : undefined}
            {...register("fullName")}
          />
        </FormField>
        <FormField id="email" label="Email" required error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-message" : undefined}
            {...register("email")}
          />
        </FormField>
        <FormField id="phone" label="Phone" required error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-message" : undefined}
            {...register("phone")}
          />
        </FormField>
        <FormField id="companyName" label="Company name" error={errors.companyName?.message}>
          <Input
            id="companyName"
            autoComplete="organization"
            aria-invalid={Boolean(errors.companyName)}
            aria-describedby={errors.companyName ? "companyName-message" : undefined}
            {...register("companyName")}
          />
        </FormField>
        <FormField
          id="mcNumber"
          label="MC number"
          hint="Optional. Digits only."
          error={errors.mcNumber?.message}
        >
          <Input
            id="mcNumber"
            inputMode="numeric"
            aria-invalid={Boolean(errors.mcNumber)}
            aria-describedby="mcNumber-message"
            {...register("mcNumber")}
          />
        </FormField>
        <FormField
          id="dotNumber"
          label="DOT number"
          hint="Optional. Digits only."
          error={errors.dotNumber?.message}
        >
          <Input
            id="dotNumber"
            inputMode="numeric"
            aria-invalid={Boolean(errors.dotNumber)}
            aria-describedby="dotNumber-message"
            {...register("dotNumber")}
          />
        </FormField>
        <FormField id="equipment" label="Equipment type" required error={errors.equipment?.message}>
          <Select
            id="equipment"
            defaultValue=""
            aria-invalid={Boolean(errors.equipment)}
            aria-describedby={errors.equipment ? "equipment-message" : undefined}
            {...register("equipment")}
          >
            <option value="" disabled>
              Select equipment
            </option>
            {equipmentServices.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name.replace(" Dispatch", "")}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="fleetSize"
          label="Number of trucks"
          required
          error={errors.fleetSize?.message}
        >
          <Input
            id="fleetSize"
            type="number"
            min={1}
            inputMode="numeric"
            aria-invalid={Boolean(errors.fleetSize)}
            aria-describedby={errors.fleetSize ? "fleetSize-message" : undefined}
            {...register("fleetSize", { valueAsNumber: true })}
          />
        </FormField>
      </div>
      <FormField
        id="preferredLanes"
        label="Preferred lanes or regions"
        error={errors.preferredLanes?.message}
      >
        <Input
          id="preferredLanes"
          aria-invalid={Boolean(errors.preferredLanes)}
          aria-describedby={errors.preferredLanes ? "preferredLanes-message" : undefined}
          {...register("preferredLanes")}
        />
      </FormField>
      <FormField id="message" label="Anything else we should know?" error={errors.message?.message}>
        <Textarea
          id="message"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-message" : undefined}
          {...register("message")}
        />
      </FormField>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <FormStatus status={status} message={message} />
      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Sending…" : "Submit inquiry"}
      </Button>
    </form>
  );
}
