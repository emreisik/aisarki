export type AdminRole = "support" | "admin" | "superadmin";
export type UserRole = "user" | AdminRole;

const RANK: Record<UserRole, number> = {
  user: 0,
  support: 1,
  admin: 2,
  superadmin: 3,
};

export function isAdminRole(
  role: string | null | undefined,
): role is AdminRole {
  return role === "support" || role === "admin" || role === "superadmin";
}

export function hasAtLeast(
  role: string | null | undefined,
  min: AdminRole,
): boolean {
  if (!role || !(role in RANK)) return false;
  return RANK[role as UserRole] >= RANK[min];
}
