import { Role, UserSummary } from '@/components/auth/auth.constants.roles';

export enum AdvanceRequestStatus {
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum AdvanceApprovalStepStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface AdvanceApprovalStep {
  id: number;
  sequence: number;
  requiredRole: Role;
  status: AdvanceApprovalStepStatus;
  actor?: UserSummary;
  decidedAt?: string;
  comment?: string;
}

export interface AdvanceRequestPermissions {
  canDecide: boolean;
  canReject: boolean;
  canCancel: boolean;
}

export interface AdvanceRequest {
  id: number;
  status: AdvanceRequestStatus;
  amountRial: number;
  reason?: string;
  requester: UserSummary;
  pendingRole?: Role;
  decidedAt?: string;
  created_at: string;
}

export interface AdvanceRequestDetail extends AdvanceRequest {
  lastDecisionComment?: string;
  approvalSteps: AdvanceApprovalStep[];
  permissions: AdvanceRequestPermissions;
}

export type GetAdvanceRequestsResponse = {
  items: AdvanceRequest[];
  meta: PaginationMeta;
};

export enum AdvanceRequestScope {
  MINE = 'mine',
  AWAITING_ME = 'awaiting_me',
  /** Management review queue: everything I can act on, excluding my own. */
  REVIEW = 'review',
}

export interface AdvanceRequestFilterDto {
  page?: number;
  limit?: number;
  scope?: AdvanceRequestScope;
  status?: AdvanceRequestStatus[];
  from?: string;
  to?: string;
}

export interface CreateAdvanceRequestDto {
  amountRial: number;
  reason?: string;
}
