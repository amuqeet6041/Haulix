"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormStatus } from "@/components/forms/form-status";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { defaultInquiryType } from "@/content/inquiry-types";
import { usePostJson } from "@/hooks/use-post-json";
import { pickFieldErrors } from "@/lib/form-errors";
import { contactSchema, type ContactData, type ContactInput } from "@/validations";

/** Visible fields in form order; server field errors are mapped onto these. */
const contactFields = [
  "fullName",
  "email",
  "phone",
  "subject",
  "message",
] as const satisfies readonly (keyof ContactInput)[];

/** General contact form. Validated with the same Zod schema the API route uses. */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactInput, unknown, ContactData>({
    resolver: zodResolver(contactSchema),
    // No topic picker yet (Phase 4.5), so every message is sent as a general question.
    defaultValues: { inquiryType: defaultInquiryType, website: "" },
  });
  const { status, message, submit } = usePostJson("/api/contact");

  async function onSubmit(data: ContactData) {
    const result = await submit(data);
    if (result.ok) {
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
        <FormField id="contact-subject" label="Subject" error={errors.subject?.message}>
          <Input
            id="contact-subject"
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "contact-subject-message" : undefined}
            {...register("subject")}
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

      <FormStatus status={status} message={message} />
      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
