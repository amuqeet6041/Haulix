"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormStatus } from "@/components/forms/form-status";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { usePostJson } from "@/hooks/use-post-json";
import { contactSchema, type ContactData, type ContactInput } from "@/validations";

/** General contact form. Validated with the same Zod schema the API route uses. */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput, unknown, ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { website: "" },
  });
  const { status, message, submit } = usePostJson("/api/contact");

  async function onSubmit(data: ContactData) {
    const ok = await submit(data);
    if (ok) reset();
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
          <Input id="contact-phone" type="tel" autoComplete="tel" {...register("phone")} />
        </FormField>
        <FormField id="contact-subject" label="Subject" required error={errors.subject?.message}>
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
