import { User } from "@/app/admin/users/users.types";

export enum Role {
  ADMIN = 'admin',
  CEO = 'ceo',
  FINANCE = 'finance',
  FINANCE_MANAGER = 'finance_manager',
  SENIOR_FINANCE = 'senior_finance',
  APPROVER = 'approver',
  HR = 'hr',
  PERSONNEL = 'personnel',
  ONCALL_MANAGER = 'oncall_manager',
  USER = 'user',
}

export enum InvitationStatus {
  PENDING = 'pending',
  AWAITING_PROFILE_COMPLETION = 'awaiting_profile_completion',
  ACCEPTED = 'accepted',
}

export type Organization = {
  id: number;
  name: string;
  description?: string;
  owner: User;
  members: RoleType[];
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserSummary = {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
  phone?: string;
  email?: string;
  profilePicture?: string | null;
};

export type RoleType = {
  id: number;
  role: Role;
  invitationStatus: InvitationStatus;
  user?: UserSummary; // Optional populated user summary
  organization?: number;
  description?: string;
};

const roleNames: Record<Role, string> = {
  [Role.ADMIN]: 'ادمین',
  [Role.CEO]: 'مدیر عامل',
  [Role.FINANCE]: 'کارشناس مالی',
  [Role.FINANCE_MANAGER]: 'مدیر مالی',
  [Role.SENIOR_FINANCE]: 'کارشناس ارشد مالی',
  [Role.APPROVER]: 'تأییدکننده',
  [Role.HR]: 'منابع انسانی',
  [Role.PERSONNEL]: 'کارگزینی',
  [Role.ONCALL_MANAGER]: 'مسئول کشیک',
  [Role.USER]: 'کاربر',
};

export function getRoleName(role: Role): string {
  return roleNames[role] || role;
}

/**
 * Ordering only — used to sort role lists and pick a sensible default.
 * Access is decided by exact role match (hasRole / hasAnyRole), because
 * `finance` and `approver` are peers with different jobs, not access levels.
 */
export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 3,
  [Role.CEO]: 3,
  [Role.FINANCE_MANAGER]: 2,
  [Role.SENIOR_FINANCE]: 2,
  [Role.FINANCE]: 2,
  [Role.APPROVER]: 1,
  [Role.HR]: 1,
  [Role.PERSONNEL]: 1,
  [Role.ONCALL_MANAGER]: 1,
  [Role.USER]: 0,
};

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}

/**
 * Roles that carry another role's access — keep in step with the backend's
 * ROLE_IMPLIES. A holder counts as having the implied roles too.
 */
const ROLE_IMPLIES: Partial<Record<Role, readonly Role[]>> = {
  [Role.SENIOR_FINANCE]: [Role.FINANCE, Role.FINANCE_MANAGER],
  [Role.PERSONNEL]: [Role.HR],
  [Role.FINANCE_MANAGER]: [Role.HR],
};

/** The roles a person effectively has: theirs plus whatever those imply. */
export function expandRoles(roles: readonly Role[]): Role[] {
  const seen = new Set<Role>();
  const visit = (r: Role) => {
    if (seen.has(r)) return;
    seen.add(r);
    (ROLE_IMPLIES[r] ?? []).forEach(visit);
  };
  roles.forEach(visit);
  return [...seen];
}

export const Roles = Object.values(Role);
