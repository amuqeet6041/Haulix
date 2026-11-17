"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormStatus } from "@/components/forms/form-status";
import { TurnstileWidget } from "@/components/forms/turnstile-widget";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { defaultInquiryType, inquiryTypes } from "@/content/inquiry-types";
import { equipmentServices } from "@/content/services";
import { useFormTimer } from "@/hooks/use-form-timer";
import { usePostJson } from "@/hooks/use-post-json";
import { useSubmissionId } from "@/hooks/use-submission-id";
import { pickFieldErrors } from "@/lib/form-errors";
import { contactSchema, type ContactData, type ContactInput } from "@/validations";

/** Visible fields in form order; server field errors are mapped onto these. */
const contactFields = [
  "fullName",
  "email",
  "phone",
  "companyName",
  "inquiryType",
  "subject",
  "equipment",
  "fleetSize",
  "message",
] as const satisfies readonly (keyof ContactInput)[];

/** General contact form (lead type CONTACT). Validated with the same Zod schema the API route uses. */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactInput, unknown, ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { inquiryType: defaultInquiryType, equipment: "", website: "" },
  });
  const { status, message, submit } = usePostJson("/api/contact");
  const submissionId = useSubmissionId();
  const timer = useFormTimer();
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);

  async function onSubmit(data: ContactData) {
    const result = await submit(data, {
      submissionId: submissionId.get(),
      elapsedMs: timer.elapsed(),
      turnstileToken,
    });
    // Turnstile tokens are single use; ask for a fresh one after every attempt.
    setTurnstileReset((count) => count + 1);
    if (result.ok) {
      submissionId.renew();
      timer.restart();
      reset();
      return;
    }
    pickFieldErrors(result.fieldErrors, contactFields).forEach(([field, fieldMessage], index) =>
      setError(field, { type: "server", message: fieldMessage }, { shouldFocus: index === 0 }),
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-name" label="Full name" required error={errors.fullName?.message}>
          <Input
            id="contact-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "contact-name-message" : undefined}
            {...register("fullName")}
          />
        </FormField>
        <FormField id="contact-email" label="Email" required error={errors.email?.message}>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-message" : undefined}
            {...register("email")}
          />
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-phone" label="Phone" error={errors.phone?.message}>
          <Input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "contact-phone-message" : undefined}
            {...register("phone")}
          />
        </FormField>
        <FormField id="contact-company" label="Company name" error={errors.companyName?.message}>
          <Input
            id="contact-company"
            autoComplete="organization"
            aria-invalid={Boolean(errors.companyName)}
            aria-describedby={errors.companyName ? "contact-company-message" : undefined}
            {...register("companyName")}
          />
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="contact-inquiry-type"
          label="What can we help with?"
          required
          error={errors.inquiryType?.message}
        >
          <Select
            id="contact-inquiry-type"
            aria-invalid={Boolean(errors.inquiryType)}
            aria-describedby={errors.inquiryType ? "contact-inquiry-type-message" : undefined}
            {...register("inquiryType")}
          >
            {inquiryTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="contact-subject" label="Subject" error={errors.subject?.message}>
          <Input
            id="contact-subject"
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "contact-subject-message" : undefined}
            {...register("subject")}
          />
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="contact-equipment" label="Equipment type" error={errors.equipment?.message}>
          <Select
            id="contact-equipment"
            aria-invalid={Boolean(errors.equipment)}
            aria-describedby={errors.equipment ? "contact-equipment-message" : undefined}
            {...register("equipment")}
          >
            <option value="">Not specified</option>
            {equipmentServices.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name.replace(" Dispatch", "")}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          id="contact-fleet-size"
          label="Number of trucks"
          error={errors.fleetSize?.message}
        >
          <Input
            id="contact-fleet-size"
            type="number"
            min={1}
            inputMode="numeric"
            aria-invalid={Boolean(errors.fleetSize)}
            aria-describedby={errors.fleetSize ? "contact-fleet-size-message" : undefined}
            {...register("fleetSize", { valueAsNumber: true })}
          />
        </FormField>
      </div>
      <FormField id="contact-message" label="Message" required error={errors.message?.message}>
        <Textarea
          id="contact-message"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-message" : undefined}
          {...register("message")}
        />
      </FormField>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileReset} />
      <FormStatus status={status} message={message} />
      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
