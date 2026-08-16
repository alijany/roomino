import { Role, UserSummary } from '@/components/auth/auth.constants.roles';

/**
 * Money on the wire is always an integer in the currency's minor unit.
 * IRR's minor unit is the rial; USD/EUR are cents. Display converts to Toman —
 * see `formatMoney` in `@/libs/format/format.util`.
 */

export enum PaymentRequestStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  NEEDS_INFO = 'needs_info',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  PAID = 'paid',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum RequestOrigin {
  EMPLOYEE = 'employee',
  FINANCE = 'finance',
  RECURRING = 'recurring',
}

export enum ApprovalStepStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

export enum Currency {
  IRR = 'IRR',
  USD = 'USD',
  EUR = 'EUR',
  AED = 'AED',
  TRY = 'TRY',
}

export enum PayeeAccountType {
  SHEBA = 'sheba',
  CARD = 'card',
  IBAN_SWIFT = 'iban_swift',
  PAYPAL = 'paypal',
  OTHER = 'other',
}

export enum PaymentSourceType {
  BANK_ACCOUNT = 'bank_account',
  CARD = 'card',
  PETTY_CASH = 'petty_cash',
  INTERMEDIARY = 'intermediary',
}

export enum AttachmentKind {
  INVOICE = 'invoice',
  QUOTE = 'quote',
  RECEIPT = 'receipt',
  CONTRACT = 'contract',
  OTHER = 'other',
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  requiresInvoice: boolean;
  active: boolean;
  parentId?: number;
}

export interface PaymentSource {
  id: number;
  label: string;
  type: PaymentSourceType;
  bankName?: string;
  sheba?: string;
  cardLast4?: string;
  accountHolder?: string;
  currency: Currency;
  notes?: string;
  active: boolean;
}

export interface ApprovalStep {
  id: number;
  sequence: number;
  requiredRole: Role;
  status: ApprovalStepStatus;
  actor?: UserSummary;
  decidedAt?: string;
  comment?: string;
}

export interface RequestAttachment {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentKind;
  uploadedBy?: UserSummary;
  created_at: string;
}

export interface RecordedPayment {
  id: number;
  paidAt: string;
  settledAmountRial: number;
  fxRateRialPerUnit?: number;
  feeRial?: number;
  intermediary?: string;
  referenceNumber?: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
  notes?: string;
  paidBy?: UserSummary;
  paymentSource?: { id: number; label: string };
}

export interface ActivityEntry {
  id: number;
  action: string;
  fromStatus?: PaymentRequestStatus;
  toStatus?: PaymentRequestStatus;
  comment?: string;
  actor?: UserSummary;
  created_at: string;
}

export interface RequestPermissions {
  canEdit: boolean;
  canSubmit: boolean;
  canDecide: boolean;
  canPay: boolean;
  canCancel: boolean;
  canAttach: boolean;
}

export interface PaymentRequest {
  id: number;
  title: string;
  status: PaymentRequestStatus;
  origin: RequestOrigin;
  amountMinor: number;
  currency: Currency;
  /** Requested amount in rial. Equals amountMinor for IRR. */
  amountRial?: number;
  dueDate: string;
  payeeName: string;
  requester: UserSummary;
  category?: { id: number; name: string };
  submittedAt?: string;
  paidAt?: string;
  pendingRole?: Role;
  created_at: string;
}

export interface PaymentRequestDetail extends PaymentRequest {
  description?: string;
  costCenter?: string;
  lastDecisionComment?: string;
  payeeAccountType: PayeeAccountType;
  payeeAccountHolder?: string;
  payeeSheba?: string;
  payeeCardNumber?: string;
  payeeAccountDetails?: string;
  approvalSteps: ApprovalStep[];
  attachments: RequestAttachment[];
  payments: RecordedPayment[];
  permissions: RequestPermissions;
}

export type GetRequestsResponse = {
  items: PaymentRequest[];
  meta: PaginationMeta;
};

export enum RequestScope {
  MINE = 'mine',
  AWAITING_ME = 'awaiting_me',
  ALL = 'all',
  PAYABLE = 'payable',
}

export interface RequestFilterDto {
  page?: number;
  limit?: number;
  scope?: RequestScope;
  status?: PaymentRequestStatus[];
  categoryId?: number;
  text?: string;
  from?: string;
  to?: string;
  overdue?: boolean;
}

export interface CreateRequestDto {
  title: string;
  description?: string;
  categoryId: number;
  amountMinor: number;
  currency: Currency;
  payeeName: string;
  payeeAccountType: PayeeAccountType;
  payeeAccountHolder?: string;
  payeeSheba?: string;
  payeeCardNumber?: string;
  payeeAccountDetails?: string;
  dueDate: string;
  costCenter?: string;
  submit?: boolean;
  origin?: RequestOrigin;
}

export type UpdateRequestDto = Partial<Omit<CreateRequestDto, 'submit' | 'origin'>>;

export interface RecordPaymentDto {
  paymentSourceId: number;
  paidAt: string;
  settledAmountRial: number;
  fxRateRialPerUnit?: number;
  feeRial?: number;
  intermediary?: string;
  referenceNumber?: string;
  receiptAttachmentId?: number;
  notes?: string;
}

export interface ApprovalPreview {
  amountRial: number;
  chain: Role[];
  requiresApproval: boolean;
}

export interface FinanceBadges {
  awaitingMe: number;
  payable: number;
  mineOpen: number;
}

export interface ApprovalRule {
  id: number;
  minAmountRial: number;
  maxAmountRial: number | null;
  categoryId: number | null;
  approverChain: Role[];
  priority: number;
  description?: string;
  active: boolean;
}

export interface ApprovalRuleInput {
  minAmountRial: number;
  maxAmountRial?: number | null;
  categoryId?: number;
  approverChain: Role[];
  priority?: number;
  description?: string;
}

export interface CreatePaymentSourceDto {
  label: string;
  type: PaymentSourceType;
  bankName?: string;
  sheba?: string;
  cardLast4?: string;
  accountHolder?: string;
  currency?: Currency;
  notes?: string;
  active?: boolean;
}
