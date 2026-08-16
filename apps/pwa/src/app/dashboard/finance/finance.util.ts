import { getRoleName, Role } from '@/components/auth/auth.constants.roles';
import { formatForeign, formatMoney } from '@/libs/format/format.util';
import { format } from 'date-fns-jalali';
import { Currency, PaymentRequest, PaymentRequestStatus } from './finance.types';

/** Jalali date for display. API dates stay ISO/Gregorian. */
export function formatJalali(value?: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'yyyy/MM/dd');
}

export function formatJalaliDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'yyyy/MM/dd — HH:mm');
}

/**
 * The amount as the reader should see it: Toman for domestic requests, the
 * foreign figure for the rest, since converting a USD invoice to Toman before
 * Finance has set a rate would be inventing a number.
 */
export function formatRequestAmount(request: Pick<PaymentRequest, 'amountMinor' | 'currency' | 'amountRial'>): string {
  if (request.currency === Currency.IRR) {
    return formatMoney(request.amountRial ?? request.amountMinor);
  }

  return formatForeign(request.amountMinor, request.currency);
}

/** Days until the deadline. Negative means overdue. */
export function daysUntil(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

const OPEN_STATUSES: PaymentRequestStatus[] = [
  PaymentRequestStatus.PENDING_APPROVAL,
  PaymentRequestStatus.NEEDS_INFO,
  PaymentRequestStatus.APPROVED,
  PaymentRequestStatus.SCHEDULED,
  PaymentRequestStatus.FAILED,
];

export function isOverdue(request: Pick<PaymentRequest, 'dueDate' | 'status'>): boolean {
  return OPEN_STATUSES.includes(request.status) && daysUntil(request.dueDate) < 0;
}

/** "۳ روز مانده" / "۲ روز گذشته" — the phrasing a reader can act on. */
export function describeDueDate(request: Pick<PaymentRequest, 'dueDate' | 'status'>): string {
  if (!OPEN_STATUSES.includes(request.status)) {
    return formatJalali(request.dueDate);
  }

  const days = daysUntil(request.dueDate);

  if (days < 0) return `${Math.abs(days).toLocaleString('fa-IR')} روز گذشته`;
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  return `${days.toLocaleString('fa-IR')} روز مانده`;
}

/** "علی رضایی، سپس ادمین" — the approver chain as a sentence. */
export function describeChain(chain: Role[]): string {
  if (chain.length === 0) {
    return 'بدون تأییدکننده — مستقیم به مالی می‌رود';
  }

  return chain.map(getRoleName).join(' ← ');
}
