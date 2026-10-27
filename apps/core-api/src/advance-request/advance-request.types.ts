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
}
