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
  /** What colleagues see in place of the official name; empty means none. */
  displayName?: string | null;
  phone: string;
  nationalId?: string | null;
  personnelCode?: string | null;
  jobTitle?: string | null;
  hireDate?: string | null;
  endDate?: string | null;
  /** Last day of a trial period; kept after it passes. */
  probationEndDate?: string | null;
  telegramConnected?: boolean;
  insuranceNumber?: string | null;
  birthDate?: string | null;
  fatherName?: string | null;
  /** The person's team in the organisation. */
  teamId?: number | null;
  insuranceStartDate?: string | null;
  bankCardNumber?: string | null;
  bankAccountNumber?: string | null;
  address?: string | null;
  sheba?: string | null;
  email?: string | null;
  married?: boolean;
  childrenCount?: number;
  insured?: boolean;
  insuranceType?: 'worker' | 'board';
  taxExempt?: boolean;
  /** Takes the supplementary insurance; its premium comes off the salary. */
  supplementaryInsurance?: boolean;
  supplementaryInsuranceStart?: string | null;
  /** A premium for this person alone (rial); empty uses the year's. */
  supplementaryInsuranceAmount?: number | null;
  cooperationEnded?: boolean;
  /** Shown to the team on the dashboard for a month from the first day. */
  introduce?: boolean;
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

export type UserStatusFilter = 'pending' | 'active' | 'probation' | 'ended' | 'contract_ending' | 'no_contract';

export interface UserFilterDto {
  page?: number;
  limit?: number;
  status?: UserStatusFilter;
  text?: string;
  role?: Role;
  /** A team; its sub-teams' members are included. */
  teamId?: number;
}

export interface AddUserRoleDto {
  role: Role;
}

export interface UpdateUserNameDto {
  firstName: string;
  lastName: string;
  /** Empty clears it. */
  displayName?: string;
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
  /** Empty clears it. */
  fatherName?: string;
  /** Civil date; empty clears it. */
  birthDate?: string;
  /** Civil date; empty clears it. */
  insuranceStartDate?: string;
  bankCardNumber?: string;
  bankAccountNumber?: string;
  address?: string;
  sheba?: string;
  email?: string;
  married?: boolean;
  childrenCount?: number;
  insured?: boolean;
  insuranceType?: 'worker' | 'board';
  taxExempt?: boolean;
  supplementaryInsurance?: boolean;
  /** Civil date; an empty string clears it. */
  supplementaryInsuranceStart?: string;
  /** Rial; null clears it. */
  supplementaryInsuranceAmount?: number | null;
  cooperationEnded?: boolean;
  /** Shown to the team on the dashboard for a month from the first day. */
  introduce?: boolean;
  agreementType?: 'gross' | 'net';
  salaryMode?: 'regular' | 'hybrid' | 'flat';
}
