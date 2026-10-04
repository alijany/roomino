import { getToken } from '@/components/auth/auth.utils.tokens';
import { withQuery } from '@/libs/api/api.util.query';
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import {
  format as formatJalali,
  getDaysInMonth as getJalaliDaysInMonth,
  newDate as newJalaliDate,
} from 'date-fns-jalali';
import { API_URL } from '../../../../constants';
import { DayFilter } from './attendance.constants';
import { DayStatus, ReportDay, RequestType } from './attendance.types';

const TEHRAN_TZ = 'Asia/Tehran';

/** Latin digits → Persian, for anything the API returns with Latin digits. */
export function fa(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

/**
 * Persian/Arabic digits → Latin, for numeric inputs typed on a Persian
 * keyboard — `Number('۱۴۰۵')` is `NaN`.
 */
export function latin(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** Minutes → `"۰۸:۳۰"`; negative values keep the minus sign. */
export function hm(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const sign = minutes < 0 ? '−' : '';
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return fa(`${sign}${h}:${m}`);
}

/** Minutes as `"۲ ساعت و ۳۰ دقیقه"` — for durations people read, not tables. */
export function durationLabel(minutes: number | null | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${fa(m)} دقیقه`;
  return m ? `${fa(h)} ساعت و ${fa(m)} دقیقه` : `${fa(h)} ساعت`;
}

// --- civil dates ---------------------------------------------------------------------

/** Today's civil date in Tehran. */
export function tehranToday(): string {
  return format(TZDate.tz(TEHRAN_TZ), 'yyyy-MM-dd');
}

/** A picked Date → Tehran civil date. */
export function toCivilDate(date: Date): string {
  return format(new TZDate(date, TEHRAN_TZ), 'yyyy-MM-dd');
}

/** A civil date → a Date at Tehran noon, for the date pickers. */
export function fromCivilDate(date: string): Date {
  return new Date(`${date}T12:00:00+03:30`);
}

export function jalaliLabel(date: string | null | undefined): string {
  if (!date) return '—';
  return fa(formatJalali(fromCivilDate(date), 'yyyy/MM/dd'));
}

export function currentJalaliMonth(): { y: number; m: number } {
  const [y, m] = formatJalali(TZDate.tz(TEHRAN_TZ), 'yyyy-M').split('-').map(Number);
  return { y, m };
}

export function shiftJalaliMonth(y: number, m: number, delta: number) {
  const index = y * 12 + (m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

export function jalaliMonthRange(y: number, m: number) {
  const days = getJalaliDaysInMonth(newJalaliDate(y, m - 1, 1));
  return {
    from: format(newJalaliDate(y, m - 1, 1), 'yyyy-MM-dd'),
    to: format(newJalaliDate(y, m - 1, days), 'yyyy-MM-dd'),
  };
}

export function jalaliMonthName(m: number): string {
  return formatJalali(newJalaliDate(1405, m - 1, 1), 'MMMM');
}

/** A timestamp as Jalali date and Tehran time. */
export function jalaliDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return fa(formatJalali(new TZDate(new Date(iso), TEHRAN_TZ), 'yyyy/MM/dd HH:mm'));
}

// --- request shapes --------------------------------------------------------------------

export type RequestShape = 'range' | 'timed' | 'manual' | 'free';

export function shapeOf(type: RequestType | ''): RequestShape | null {
  if (!type) return null;
  if (type.endsWith('_daily')) return 'range';
  if (type.endsWith('_hourly') || type === RequestType.OVERTIME) return 'timed';
  if (type === RequestType.MANUAL_ATTENDANCE) return 'manual';
  return 'free';
}

// --- report days -----------------------------------------------------------------------

export function filterDays(days: ReportDay[], filter: DayFilter): ReportDay[] {
  switch (filter) {
    case 'issues':
      return days.filter((d) => d.needsFix);
    case 'delay':
      return days.filter((d) => d.delay > 0);
    case 'early':
      return days.filter((d) => d.early > 0);
    case 'absent':
      return days.filter((d) => d.status === DayStatus.ABSENT);
    case 'leave':
      return days.filter(
        (d) =>
          [DayStatus.ON_LEAVE, DayStatus.MISSION].includes(d.status) || d.leaveMinutes > 0,
      );
    case 'remote':
      return days.filter((d) => d.status === DayStatus.REMOTE || d.remote > 0);
    default:
      return days;
  }
}

// --- browser ---------------------------------------------------------------------------

/** Current position, or a Persian reason it couldn't be read. */
export function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('دسترسی به موقعیت مکانی داده نشد. لطفاً GPS را فعال کنید.')),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

/**
 * The export endpoints are authenticated, so they can't be plain links —
 * fetch with the bearer token and hand the browser a blob.
 */
export async function downloadCsv(
  path: string,
  query: object,
  filename: string,
) {
  const response = await fetch(withQuery(`${API_URL}${path}`, query as Record<string, never>), {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('دریافت فایل خروجی ناموفق بود');

  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** Error message of a failed mutation, with a fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: string | string[] })?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  return message || fallback;
}
