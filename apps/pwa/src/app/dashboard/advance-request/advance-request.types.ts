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
  /** Finance may record a settlement made by hand. */
  canSettle: boolean;
}

/** One piece of a settlement; `period` (Jalali YYYYMM) is null for one made by hand. */
export interface AdvanceSettlementPiece {
  id: number;
  kind: 'payroll' | 'manual';
  period: number | null;
  amount: number;
  at: string;
  note: string | null;
  recordedBy: string | null;
}

/** Where an approved advance stands against the pay it is taken off. */
export interface AdvanceSettlement {
  status: 'unsettled' | 'partial' | 'settled';
  /** Rial taken off so far, and rial still owed. */
  deducted: number;
  remaining: number;
  /** The day the last piece was taken off, once nothing is owed. */
  settledAt: string | null;
  /** Each piece: taken off a pay month, or settled by hand. */
  deductions: AdvanceSettlementPiece[];
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
  /** Only for an approved request. */
  settlement?: AdvanceSettlement | null;
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

export interface CreateSettlementDto {
  amount: number;
  /** `YYYY-MM-DD`; today when omitted. */
  paidOn?: string;
  note?: string;
}

export interface CreateAdvanceRequestDto {
  amountRial: number;
  reason?: string;
}
