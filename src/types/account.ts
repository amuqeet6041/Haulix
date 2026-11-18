/**
 * What the account page shows. Deliberately small: no password data, no
 * session tokens, no IP addresses, no internal ids beyond the opaque session id
 * the page needs to revoke that session.
 */

export interface AccountProfile {
  name: string;
  email: string;
  role: string;
  /** ISO time the account was created. */
  memberSince: string;
}

export interface AccountSession {
  /** Opaque session id. It is NOT the session token and cannot be used to sign in. */
  id: string;
  /** True for the session making this request. */
  current: boolean;
  /** Short device label such as "Chrome on Windows". */
  device: string;
  createdAt: string;
  /** Last time the session was refreshed; the best available "last active". */
  lastActiveAt: string;
  expiresAt: string;
}
