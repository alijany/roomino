import { BadgeTone } from '@/ui/atoms/ui.badge';
import {
  AttachmentKind,
  Currency,
  PayeeAccountType,
  PaymentRequestStatus,
  PaymentSourceType,
} from './finance.types';

/**
 * Status presentation, decided once. Tone is semantic — "waiting on a person"
 * is amber whether that person is an approver or Finance — so the same colour
 * never means two different things across screens.
 */
export const STATUS_META: Record<
  PaymentRequestStatus,
  { label: string; tone: BadgeTone; hint: string }
> = {
  [PaymentRequestStatus.DRAFT]: {
    label: 'پیش‌نویس',
    tone: 'neutral',
    hint: 'هنوز ارسال نشده و فقط شما آن را می‌بینید.',
  },
  [PaymentRequestStatus.PENDING_APPROVAL]: {
    label: 'در انتظار تأیید',
    tone: 'warning',
    hint: 'منتظر تصمیم تأییدکننده است.',
  },
  [PaymentRequestStatus.NEEDS_INFO]: {
    label: 'نیازمند اصلاح',
    tone: 'warning',
    hint: 'برای ادامه، درخواست باید اصلاح و دوباره ارسال شود.',
  },
  [PaymentRequestStatus.APPROVED]: {
    label: 'تأییدشده',
    tone: 'info',
    hint: 'در صف پرداخت مالی است.',
  },
  [PaymentRequestStatus.SCHEDULED]: {
    label: 'زمان‌بندی‌شده',
    tone: 'info',
    hint: 'تأیید شده و در تاریخ مقرر پرداخت می‌شود.',
  },
  [PaymentRequestStatus.PAID]: {
    label: 'پرداخت‌شده',
    tone: 'success',
    hint: 'پرداخت انجام و ثبت شده است.',
  },
  [PaymentRequestStatus.REJECTED]: {
    label: 'ردشده',
    tone: 'danger',
    hint: 'تأییدکننده این درخواست را رد کرده است.',
  },
  [PaymentRequestStatus.CANCELLED]: {
    label: 'لغوشده',
    tone: 'muted',
    hint: 'ثبت‌کننده درخواست را پس گرفته است.',
  },
  [PaymentRequestStatus.FAILED]: {
    label: 'پرداخت ناموفق',
    tone: 'danger',
    hint: 'پرداخت انجام نشد و درخواست به صف پرداخت برگشت.',
  },
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  [Currency.IRR]: 'ریال ایران',
  [Currency.USD]: 'دلار آمریکا',
  [Currency.EUR]: 'یورو',
  [Currency.AED]: 'درهم امارات',
  [Currency.TRY]: 'لیر ترکیه',
};

export const PAYEE_ACCOUNT_TYPE_LABELS: Record<PayeeAccountType, string> = {
  [PayeeAccountType.SHEBA]: 'شماره شبا',
  [PayeeAccountType.CARD]: 'شماره کارت',
  [PayeeAccountType.IBAN_SWIFT]: 'IBAN / SWIFT',
  [PayeeAccountType.PAYPAL]: 'پی‌پال',
  [PayeeAccountType.OTHER]: 'سایر',
};

export const PAYMENT_SOURCE_TYPE_LABELS: Record<PaymentSourceType, string> = {
  [PaymentSourceType.BANK_ACCOUNT]: 'حساب بانکی',
  [PaymentSourceType.CARD]: 'کارت بانکی',
  [PaymentSourceType.PETTY_CASH]: 'تنخواه',
  [PaymentSourceType.INTERMEDIARY]: 'واسط پرداخت',
};

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  [AttachmentKind.INVOICE]: 'فاکتور',
  [AttachmentKind.QUOTE]: 'پیش‌فاکتور',
  [AttachmentKind.RECEIPT]: 'رسید پرداخت',
  [AttachmentKind.CONTRACT]: 'قرارداد',
  [AttachmentKind.OTHER]: 'سایر',
};

/** Timeline verbs, phrased from the reader's point of view. */
export const ACTIVITY_LABELS: Record<string, string> = {
  created: 'درخواست ساخته شد',
  updated: 'درخواست ویرایش شد',
  submitted: 'برای تأیید ارسال شد',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  info_requested: 'برای اصلاح برگشت داده شد',
  cancelled: 'لغو شد',
  paid: 'پرداخت ثبت شد',
  payment_failed: 'پرداخت ناموفق بود',
  attachment_added: 'پیوست اضافه شد',
  attachment_removed: 'پیوست حذف شد',
};

export const FINANCE_ROUTES = {
  myRequests: '/dashboard/finance/my-requests',
  approvals: '/dashboard/finance/approvals',
  queue: '/dashboard/finance/queue',
  sources: '/dashboard/finance/sources',
  settings: '/dashboard/finance/settings',
  request: (id: number) => `/dashboard/finance/requests/${id}`,
};
