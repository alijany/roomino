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
  nationalId?: string | null;
  personnelCode?: string | null;
  jobTitle?: string | null;
  hireDate?: string | null;
  endDate?: string | null;
  /** Last day of a trial period; kept after it passes. */
  probationEndDate?: string | null;
  insuranceNumber?: string | null;
  sheba?: string | null;
  email?: string | null;
  married?: boolean;
  childrenCount?: number;
  insured?: boolean;
  insuranceType?: 'worker' | 'board';
  taxExempt?: boolean;
  agreementType?: 'gross' | 'net';
  salaryMode?: 'regular' | 'hybrid' | 'flat';
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

export type UserStatusFilter = 'pending' | 'active' | 'probation' | 'ended';

export interface UserFilterDto {
  page?: number;
  limit?: number;
  status?: UserStatusFilter;
  text?: string;
  role?: Role;
}

export interface AddUserRoleDto {
  role: Role;
}

export interface UpdateUserNameDto {
  firstName: string;
  lastName: string;
  /** The number the person signs in with. */
  phone?: string;
  /** Ten digits; an empty string clears it. */
  nationalId?: string;
  personnelCode?: string;
  jobTitle: string;
  /** Civil dates `YYYY-MM-DD`; an empty string clears them. */
  hireDate?: string;
  endDate?: string;
  /** Empty clears it (no trial). */
  probationEndDate?: string;
  insuranceNumber?: string;
  sheba?: string;
  email?: string;
  married?: boolean;
  childrenCount?: number;
  insured?: boolean;
  insuranceType?: 'worker' | 'board';
  taxExempt?: boolean;
  agreementType?: 'gross' | 'net';
  salaryMode?: 'regular' | 'hybrid' | 'flat';
}
