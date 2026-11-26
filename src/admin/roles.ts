import type { ParsedToken } from "firebase/auth";
import { USER_ROLES } from "./roleConstants";

export { USER_ROLES };

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type SystemAdminRole = typeof USER_ROLES.SYSTEM_ADMIN;

export type AuthClaims = ParsedToken & {
  role?: unknown;
};

export function isSystemAdminClaim(claims: AuthClaims | Record<string, unknown> | null | undefined): boolean {
  return claims?.role === USER_ROLES.SYSTEM_ADMIN;
}
