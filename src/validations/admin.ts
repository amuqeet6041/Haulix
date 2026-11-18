import { z } from "zod";

/**
 * Admin sign-in form. Only shape checks: whether the account exists, is an
 * admin, or the password is right is decided on the server and reported with
 * one generic message.
 */
export const adminLoginSchema = z.object({
  email: z
    .email("Enter a valid email address.")
    .trim()
    .toLowerCase()
    .max(254, "Enter a valid email address."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Passwords are at most 128 characters."),
});

export type AdminLoginData = z.output<typeof adminLoginSchema>;
export type AdminLoginInput = z.input<typeof adminLoginSchema>;
