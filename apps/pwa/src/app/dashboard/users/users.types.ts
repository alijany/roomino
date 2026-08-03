import { Role } from "@/components/auth/auth.constants.roles";

export enum InvitationStatus {
  PENDING = 'pending',
  AWAITING_PROFILE_COMPLETION = 'awaiting_profile_completion',
  ACCEPTED = 'accepted',
}

export interface UserRole {
  id: number;
  role: Role;
  invitationStatus: InvitationStatus;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  isApproved: boolean;
  roles: UserRole[];
}

export type GetUsersResponse = {
  items: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
};


export interface AddUserDto {
  // name?: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  role?: Role;
}

export interface UserFilterDto {
  page?: number;
  limit?: number;
  isApproved?: boolean;
}

export interface UpdateUserRoleDto {
  roleId: number;
  role: Role;
}
