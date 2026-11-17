import { CheckCircle2, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface FormStatusProps {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
}

/** Announces the result of a form submission to all users, including screen readers. */
export function FormStatus({ status, message }: FormStatusProps) {
  if (status !== "success" && status !== "error") return null;
  const isSuccess = status === "success";
  const Icon = isSuccess ? CheckCircle2 : CircleAlert;

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        isSuccess
          ? "border-orange/30 bg-surface text-foreground"
          : "border-destructive/40 bg-surface text-destructive",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
