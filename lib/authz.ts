/* eslint-disable @typescript-eslint/no-explicit-any */
import type { User } from "@clerk/nextjs/server";

/**
 * Determine if a Clerk user is authorized to access the admin.
 *
 * Authorization sources (any match grants access):
 * - ADMIN_EMAILS env var: comma-separated list of allowed emails
 * - user.publicMetadata.isAdmin === true
 * - user.publicMetadata.role in ADMIN_ROLES (comma-separated)
 */
export function isAuthorized(user: User | null | undefined): boolean {
  if (!user) return false;

  // Check email allowlist
  const allowedEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const primaryEmail =
    (user as any)?.primaryEmailAddress?.emailAddress?.toLowerCase?.() ||
    user.emailAddresses?.[0]?.emailAddress?.toLowerCase?.();

  if (allowedEmails.length && primaryEmail && allowedEmails.includes(primaryEmail)) {
    return true;
  }

  // Check metadata flags
  const pm = (user as any)?.publicMetadata || {};
  if (pm?.isAdmin === true) return true;

  const allowedRoles = (process.env.ADMIN_ROLES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const roleVal: string | string[] | undefined = pm?.role ?? pm?.roles;
  const roles: string[] = Array.isArray(roleVal)
    ? roleVal.map((r) => String(r).toLowerCase())
    : roleVal
    ? [String(roleVal).toLowerCase()]
    : [];

  if (allowedRoles.length && roles.some((r) => allowedRoles.includes(r))) {
    return true;
  }

  // If no explicit policy is configured, default to allowing access.
  // Configure ADMIN_EMAILS or ADMIN_ROLES (or set publicMetadata.isAdmin) to restrict.
  if (!allowedEmails.length && !allowedRoles.length && pm?.isAdmin !== false) {
    return true;
  }

  return false;
}

