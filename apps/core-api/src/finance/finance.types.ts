import { Role } from '../roles/roles.constants';
import {
  ApprovalStepStatus,
  Currency,
  PaymentRequestStatus,
} from './finance.constants';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface UserSummary {
  id: number;
  name?: string;
  phone?: string;
}

export interface ApprovalStepView {
  id: number;
  sequence: number;
  requiredRole: Role;
  status: ApprovalStepStatus;
  actor?: UserSummary;
  decidedAt?: Date;
  comment?: string;
}

export interface AttachmentView {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  uploadedBy?: UserSummary;
  created_at: Date;
}

export interface PaymentView {
  id: number;
  paidAt: Date;
  settledAmountRial: number;
  fxRateRialPerUnit?: number;
  feeRial?: number;
  intermediary?: string;
  referenceNumber?: string;
  status: string;
  failureReason?: string;
  notes?: string;
  paidBy?: UserSummary;
  paymentSource?: { id: number; label: string };
}

export interface ActivityView {
  id: number;
  action: string;
  fromStatus?: PaymentRequestStatus;
  toStatus?: PaymentRequestStatus;
  comment?: string;
  actor?: UserSummary;
  created_at: Date;
}

export interface PaymentRequestListItem {
  id: number;
  title: string;
  status: PaymentRequestStatus;
  origin: string;
  amountMinor: number;
  currency: Currency;
  /** Requested amount converted to rial. Equals amountMinor for IRR. */
  amountRial?: number;
  dueDate: Date;
  payeeName: string;
  requester: UserSummary;
  category?: { id: number; name: string };
  submittedAt?: Date;
  paidAt?: Date;
  /** Role that must act next, when the request is awaiting approval. */
  pendingRole?: Role;
  created_at: Date;
}

export interface PaymentRequestDetail extends PaymentRequestListItem {
  description?: string;
  costCenter?: string;
  lastDecisionComment?: string;
  payeeAccountType: string;
  payeeAccountHolder?: string;
  payeeSheba?: string;
  payeeCardNumber?: string;
  payeeAccountDetails?: string;
  approvalSteps: ApprovalStepView[];
  attachments: AttachmentView[];
  payments: PaymentView[];
  /** What the current viewer is allowed to do right now. */
  permissions: RequestPermissions;
}

export interface RequestPermissions {
  canEdit: boolean;
  canSubmit: boolean;
  canDecide: boolean;
  canPay: boolean;
  canCancel: boolean;
  canAttach: boolean;
}

/** Which approver chain a given amount would trigger, shown before submit. */
export interface ApprovalPreview {
  amountRial: number;
  chain: Role[];
  requiresApproval: boolean;
}
