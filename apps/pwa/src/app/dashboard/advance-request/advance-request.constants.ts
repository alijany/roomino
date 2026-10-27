import { BadgeTone } from '@/ui/atoms/ui.badge';
import { AdvanceRequestStatus } from './advance-request.types';

/**
 * Status presentation, decided once — mirrors the finance module's
 * STATUS_META convention so the same tone always means the same thing
 * across screens.
 */
export const STATUS_META: Record<
  AdvanceRequestStatus,
  { label: string; tone: BadgeTone; hint: string }
> = {
  [AdvanceRequestStatus.PENDING_APPROVAL]: {
    label: 'در انتظار تأیید',
    tone: 'warning',
    hint: 'منتظر تصمیم مدیرعامل یا مدیر مالی است.',
  },
  [AdvanceRequestStatus.APPROVED]: {
    label: 'تأییدشده',
    tone: 'success',
    hint: 'هم مدیرعامل و هم مدیر مالی تأیید کرده‌اند.',
  },
  [AdvanceRequestStatus.REJECTED]: {
    label: 'ردشده',
    tone: 'danger',
    hint: 'یکی از تأییدکننده‌ها این درخواست را رد کرده است.',
  },
  [AdvanceRequestStatus.CANCELLED]: {
    label: 'لغوشده',
    tone: 'muted',
    hint: 'ثبت‌کننده درخواست را پس گرفته است.',
  },
};

export const ADVANCE_REQUEST_ROUTES = {
  home: '/dashboard/advance-request',
  // Nested under /review — see the detail page's own comment for why.
  request: (id: number) => `/dashboard/advance-request/review/${id}`,
};
