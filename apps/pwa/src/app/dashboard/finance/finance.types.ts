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

/**
 * Two genuinely different destinations. A bank transfer needs an account to pay
 * into; topping up an account on a website needs the site and the login.
 */
export enum PaymentDestinationKind {
  BANK_TRANSFER = 'bank_transfer',
  ONLINE_ACCOUNT = 'online_account',
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

export enum VendorKind {
  DOMESTIC = 'domestic',
  FOREIGN = 'foreign',
}

export enum RecurrenceCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM_DAYS = 'custom_days',
}

export enum BillingCalendar {
  GREGORIAN = 'gregorian',
  JALALI = 'jalali',
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
  vendor?: { id: number; name: string };
  destinationKind: PaymentDestinationKind;
  recurringSourceId?: number;
  submittedAt?: string;
  paidAt?: string;
  pendingRole?: Role;
  created_at: string;
}

export interface PaymentRequestDetail extends PaymentRequest {
  description?: string;
  costCenter?: string;
  lastDecisionComment?: string;
  /** Null for an online top-up — there is no payee bank instrument. */
  payeeAccountType?: PayeeAccountType;
  payeeAccountHolder?: string;
  payeeSheba?: string;
  payeeCardNumber?: string;
  payeeAccountDetails?: string;
  destinationUrl?: string;
  destinationAccount?: string;
  /** Whether a login is stored. The value comes from the reveal endpoint. */
  hasDestinationCredential: boolean;
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
  payeeAccountType?: PayeeAccountType;
  payeeAccountHolder?: string;
  payeeSheba?: string;
  payeeCardNumber?: string;
  payeeAccountDetails?: string;
  destinationKind?: PaymentDestinationKind;
  destinationUrl?: string;
  destinationAccount?: string;
  destinationCredential?: string;
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

// --- vendors & recurring (phase 2) -----------------------------------------

export interface PayeeAccount {
  id: number;
  label: string;
  type: PayeeAccountType;
  holderName?: string;
  sheba?: string;
  cardNumber?: string;
  iban?: string;
  swift?: string;
  details?: string;
  isDefault: boolean;
  active: boolean;
}

export interface Vendor {
  id: number;
  name: string;
  nameEn?: string;
  kind: VendorKind;
  economicCode?: string;
  nationalId?: string;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  defaultCurrency: Currency;
  notes?: string;
  active: boolean;
  accounts: PayeeAccount[];
}

export interface RecurringExpense {
  id: number;
  title: string;
  vendor?: { id: number; name: string; kind: VendorKind };
  category?: { id: number; name: string };
  payeeAccount?: PayeeAccount;
  defaultPaymentSource?: { id: number; label: string };
  amountMinor: number;
  currency: Currency;
  amountRial?: number;
  cycle: RecurrenceCycle;
  cycleDays?: number;
  calendar: BillingCalendar;
  nextDueDate: string;
  endDate?: string;
  reminderDays: number[];
  leadDays: number;
  owner?: UserSummary;
  autoGenerate: boolean;
  notes?: string;
  active: boolean;
}

export interface CreateVendorDto {
  name: string;
  nameEn?: string;
  kind?: VendorKind;
  economicCode?: string;
  nationalId?: string;
  website?: string;
  contactName?: string;
  contactPhone?: string;
  defaultCurrency?: Currency;
  notes?: string;
  active?: boolean;
}

export interface CreatePayeeAccountDto {
  label: string;
  type: PayeeAccountType;
  holderName?: string;
  sheba?: string;
  cardNumber?: string;
  iban?: string;
  swift?: string;
  details?: string;
  isDefault?: boolean;
  active?: boolean;
}

export interface CreateRecurringDto {
  title: string;
  vendorId: number;
  categoryId: number;
  payeeAccountId?: number;
  defaultPaymentSourceId?: number;
  amountMinor: number;
  currency: Currency;
  cycle: RecurrenceCycle;
  cycleDays?: number;
  calendar?: BillingCalendar;
  nextDueDate: string;
  endDate?: string;
  reminderDays?: number[];
  leadDays?: number;
  ownerId?: number;
  autoGenerate?: boolean;
  notes?: string;
  active?: boolean;
}

export interface VendorFilterDto {
  page?: number;
  limit?: number;
  text?: string;
  kind?: VendorKind;
  activeOnly?: boolean;
}

export interface RecurringFilterDto {
  page?: number;
  limit?: number;
  text?: string;
  vendorId?: number;
  activeOnly?: boolean;
  dueWithinDays?: number;
}

// --- reporting (phase 3) ----------------------------------------------------

export interface FinanceDashboard {
  range: { from: string; to: string };
  paid: {
    totalRial: number;
    count: number;
    previousTotalRial: number;
    /** Null when there is no prior period to compare against. */
    changePercent: number | null;
  };
  pendingApproval: { count: number; totalRial: number };
  readyToPay: { count: number; totalRial: number };
  overdueCount: number;
  upcoming30DaysRial: number;
  recurring: { activeCount: number; monthlyRunRateRial: number };
  averageApprovalDays: number;
  foreignSpend: { totalRial: number; feesRial: number; count: number };
}

export interface NamedTotal {
  id?: number;
  name: string;
  totalRial: number;
  count: number;
}

export interface TrendPoint {
  month: string;
  totalRial: number;
  foreignRial: number;
  domesticRial: number;
  count: number;
}

export interface VarianceRow {
  id: number;
  title: string;
  requestedMinor: number;
  currency: Currency;
  settledRial: number;
  fxRateRialPerUnit?: number;
  feeRial?: number;
  intermediary?: string;
}

export interface MonthlyReport {
  period: { year: number; month: number; from: string; to: string };
  summary: { totalRial: number; feesRial: number; count: number };
  byCategory: NamedTotal[];
  byVendor: NamedTotal[];
  bySource: NamedTotal[];
  foreign: {
    totalRial: number;
    feesRial: number;
    count: number;
    averageRateRial: number;
  };
  variance: VarianceRow[];
  stillUnpaid: { count: number; totalRial: number };
}

export interface UpcomingCommitments {
  requests: Array<{
    id: number;
    title: string;
    dueDate: string;
    status: PaymentRequestStatus;
    amountMinor: number;
    currency: Currency;
    vendorName?: string;
  }>;
  schedules: Array<{
    id: number;
    title: string;
    nextDueDate: string;
    amountMinor: number;
    currency: Currency;
    vendorName?: string;
  }>;
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
