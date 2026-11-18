/**
 * Admin sign-in messages. Kept outside the client component so the server-
 * rendered login page can read them too.
 *
 * One generic message covers every credential or access failure, so the page
 * never reveals whether an email exists, is an admin, or is banned.
 */
export const GENERIC_SIGN_IN_ERROR = "The email or password is incorrect.";
export const RATE_LIMITED_ERROR =
  "Too many sign-in attempts. Please wait a few minutes and try again.";
export const UNAVAILABLE_ERROR = "Sign-in is not available right now. Please try again later.";
/**
 * Shown when the server refuses the page's origin (Better Auth INVALID_ORIGIN). It is about the
 * address in the browser, not the account, so it reveals nothing about whether an email exists.
 */
export const ORIGIN_ERROR =
  "Sign-in is not allowed from this web address. Open the admin from the official HAULIX site and try again.";
export const NETWORK_ERROR = "We could not reach the server. Check your connection and try again.";

/** Notices for /admin/login?reason=… (set by the protected admin pages). */
export const LOGIN_NOTICES: Readonly<Record<string, string>> = {
  denied: "That account cannot access the admin area. Sign in with an admin account.",
  unavailable: UNAVAILABLE_ERROR,
};
