import { Role } from '../roles/roles.constants';
import {
  AdvanceApprovalStepStatus,
  AdvanceRequestStatus,
} from './advance-request.constants';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface UserSummary {
  id: number;
  name?: string;
  phone?: string;
  profilePicture?: string | null;
}

export interface AdvanceApprovalStepView {
  id: number;
  sequence: number;
  requiredRole: Role;
  status: AdvanceApprovalStepStatus;
  actor?: UserSummary;
  decidedAt?: Date;
  comment?: string;
}

/** One piece of a settlement. `period` is the Jalali YYYYMM of the pay it came off; null for a manual one. */
export interface AdvanceSettlementPiece {
  id: number;
  kind: 'payroll' | 'manual';
  period: number | null;
  amount: number;
  /** The day it was settled. */
  at: Date | string;
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
  settledAt: Date | string | null;
  /** Each piece: taken off a pay month, or settled by hand. */
  deductions: AdvanceSettlementPiece[];
}

export interface AdvanceRequestListItem {
  id: number;
  status: AdvanceRequestStatus;
  amountRial: number;
  reason?: string;
  requester: UserSummary;
  /** Role that must act next, when the request is awaiting approval. */
  pendingRole?: Role;
  decidedAt?: Date;
  created_at: Date;
  /** Only for an approved request; null otherwise. */
  settlement?: AdvanceSettlement | null;
}

export interface AdvanceRequestDetail extends AdvanceRequestListItem {
  lastDecisionComment?: string;
  approvalSteps: AdvanceApprovalStepView[];
  /** What the current viewer is allowed to do right now. */
  permissions: AdvanceRequestPermissions;
}

export interface AdvanceRequestPermissions {
  canDecide: boolean;
  canReject: boolean;
  canCancel: boolean;
  /** Finance may record a manual settlement while something is still owed. */
  canSettle: boolean;
}
