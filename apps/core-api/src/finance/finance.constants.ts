/**
 * Lifecycle of a payment request. Every member is a state a human recognises
 * and can act on — no internal-only states leak to the UI.
 */
export enum PaymentRequestStatus {
  /** Saved but not submitted. Only the requester sees it. */
  DRAFT = 'draft',
  /** At least one approval step is still outstanding. */
  PENDING_APPROVAL = 'pending_approval',
  /** Returned to the requester for correction. Edit rights go back to them. */
  NEEDS_INFO = 'needs_info',
  /** All approvals passed. Sitting in the Finance payment queue. */
  APPROVED = 'approved',
  /** Approved with a future payment date (used by recurring expenses). */
  SCHEDULED = 'scheduled',
  /** Terminal. Money left the company and the payment is recorded. */
  PAID = 'paid',
  /** Terminal. An approver said no. */
  REJECTED = 'rejected',
  /** Terminal. The requester withdrew it. */
  CANCELLED = 'cancelled',
  /** The transfer failed; the request is back in the queue with a reason. */
  FAILED = 'failed',
}

/** Statuses that can no longer change. */
export const TERMINAL_STATUSES: readonly PaymentRequestStatus[] = [
  PaymentRequestStatus.PAID,
  PaymentRequestStatus.REJECTED,
  PaymentRequestStatus.CANCELLED,
];

/** Statuses in which the requester may still edit the request body. */
export const EDITABLE_STATUSES: readonly PaymentRequestStatus[] = [
  PaymentRequestStatus.DRAFT,
  PaymentRequestStatus.NEEDS_INFO,
];

/** Statuses Finance can record a payment against. */
export const PAYABLE_STATUSES: readonly PaymentRequestStatus[] = [
  PaymentRequestStatus.APPROVED,
  PaymentRequestStatus.SCHEDULED,
  PaymentRequestStatus.FAILED,
];

export const PaymentRequestStatusLabels: Record<PaymentRequestStatus, string> =
  {
    [PaymentRequestStatus.DRAFT]: 'پیش‌نویس',
    [PaymentRequestStatus.PENDING_APPROVAL]: 'در انتظار تأیید',
    [PaymentRequestStatus.NEEDS_INFO]: 'نیازمند اصلاح',
    [PaymentRequestStatus.APPROVED]: 'تأییدشده',
    [PaymentRequestStatus.SCHEDULED]: 'زمان‌بندی‌شده',
    [PaymentRequestStatus.PAID]: 'پرداخت‌شده',
    [PaymentRequestStatus.REJECTED]: 'ردشده',
    [PaymentRequestStatus.CANCELLED]: 'لغوشده',
    [PaymentRequestStatus.FAILED]: 'پرداخت ناموفق',
  };

/** Who raised the request. Company-level payments are raised by Finance itself. */
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

/**
 * Supported currencies. Amounts are always stored as integers in the currency's
 * minor unit — rial for IRR, cent for the rest.
 */
export enum Currency {
  IRR = 'IRR',
  USD = 'USD',
  EUR = 'EUR',
  AED = 'AED',
  TRY = 'TRY',
}

export const CurrencyLabels: Record<Currency, string> = {
  [Currency.IRR]: 'تومان',
  [Currency.USD]: 'دلار آمریکا',
  [Currency.EUR]: 'یورو',
  [Currency.AED]: 'درهم امارات',
  [Currency.TRY]: 'لیر ترکیه',
};

/** How we hold the money we are paying from. */
export enum PaymentSourceType {
  BANK_ACCOUNT = 'bank_account',
  CARD = 'card',
  PETTY_CASH = 'petty_cash',
  INTERMEDIARY = 'intermediary',
}

/**
 * What kind of destination the money is going to.
 *
 * Two genuinely different jobs, not a cosmetic split. A bank transfer needs an
 * account number Finance can pay *into*. Topping up a company account on a
 * website needs the site and the login — asking for a Sheba there is asking for
 * something that does not exist.
 */
export enum PaymentDestinationKind {
  BANK_TRANSFER = 'bank_transfer',
  ONLINE_ACCOUNT = 'online_account',
}

export const PaymentDestinationKindLabels: Record<
  PaymentDestinationKind,
  string
> = {
  [PaymentDestinationKind.BANK_TRANSFER]: 'واریز به حساب بانکی',
  [PaymentDestinationKind.ONLINE_ACCOUNT]: 'شارژ حساب در یک سایت',
};

/** How the payee wants to be paid. */
export enum PayeeAccountType {
  SHEBA = 'sheba',
  CARD = 'card',
  IBAN_SWIFT = 'iban_swift',
  PAYPAL = 'paypal',
  OTHER = 'other',
}

export enum AttachmentKind {
  INVOICE = 'invoice',
  QUOTE = 'quote',
  RECEIPT = 'receipt',
  CONTRACT = 'contract',
  OTHER = 'other',
}

export enum PaymentStatus {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

/**
 * Domestic vs foreign is operational, not cosmetic: a foreign vendor cannot be
 * paid directly from Iran, so those payments carry an intermediary and a rate.
 */
export enum VendorKind {
  DOMESTIC = 'domestic',
  FOREIGN = 'foreign',
}

export const VendorKindLabels: Record<VendorKind, string> = {
  [VendorKind.DOMESTIC]: 'داخلی',
  [VendorKind.FOREIGN]: 'خارجی',
};

export enum RecurrenceCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM_DAYS = 'custom_days',
}

export const RecurrenceCycleLabels: Record<RecurrenceCycle, string> = {
  [RecurrenceCycle.MONTHLY]: 'ماهانه',
  [RecurrenceCycle.QUARTERLY]: 'سه‌ماهه',
  [RecurrenceCycle.YEARLY]: 'سالانه',
  [RecurrenceCycle.CUSTOM_DAYS]: 'دوره دلخواه',
};

/** SaaS bills on Gregorian months; rent and local services on Jalali ones. */
export enum BillingCalendar {
  GREGORIAN = 'gregorian',
  JALALI = 'jalali',
}

export const BillingCalendarLabels: Record<BillingCalendar, string> = {
  [BillingCalendar.GREGORIAN]: 'میلادی',
  [BillingCalendar.JALALI]: 'شمسی',
};

/** Append-only audit actions written to FinanceActivityEntity. */
export enum FinanceActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INFO_REQUESTED = 'info_requested',
  CANCELLED = 'cancelled',
  PAID = 'paid',
  PAYMENT_FAILED = 'payment_failed',
  ATTACHMENT_ADDED = 'attachment_added',
  ATTACHMENT_REMOVED = 'attachment_removed',
}

/** Rial per Toman. Storage is rial; display is Toman. */
export const RIAL_PER_TOMAN = 10;

/** Every scheduled finance job runs on Iran civil time. */
export const TEHRAN_TZ = 'Asia/Tehran';

/** S3 folder for request attachments. */
export const FINANCE_ATTACHMENT_FOLDER = 'finance-attachments';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];
