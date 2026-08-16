import { User } from "@/app/dashboard/users/users.types";

export enum Role {
  ADMIN = 'admin',
  FINANCE = 'finance',
  APPROVER = 'approver',
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
  phone?: string;
  email?: string;
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
  [Role.FINANCE]: 'مالی',
  [Role.APPROVER]: 'تأییدکننده',
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
  [Role.FINANCE]: 2,
  [Role.APPROVER]: 1,
  [Role.USER]: 0,
};

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}

export const Roles = Object.values(Role);
