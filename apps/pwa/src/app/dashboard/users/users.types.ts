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
  firstName: string | null;
  lastName: string | null;
  phone: string;
  personnelCode?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
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
  jobTitle?: string;
  role?: Role;
}

export interface UserFilterDto {
  page?: number;
  limit?: number;
  isApproved?: boolean;
}

export interface AddUserRoleDto {
  role: Role;
}

export interface UpdateUserNameDto {
  firstName: string;
  lastName?: string;
  personnelCode?: string;
  /** An empty string clears it. */
  jobTitle?: string;
}
