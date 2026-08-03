import { User } from "@/app/dashboard/users/users.types";

export enum Role {
  ADMIN = 'admin',
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

export function getRoleName(role: Role): string {
  const roleNames: Record<Role, string> = {
    [Role.ADMIN]: 'ادمین',
    [Role.USER]: 'کاربر',
  };
  return roleNames[role] || role;
}

export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 1,
  [Role.USER]: 0,
};

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}

export const Roles = Object.values(Role);