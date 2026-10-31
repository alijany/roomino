import { getToken } from '@/components/auth/auth.utils.tokens';
import { API_URL } from '../../../../../constants';

import { getMonth, getYear } from 'date-fns-jalali';

export const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/** `140507` for مهر ۱۴۰۵ — sorts in time order. */
/** The company's registered name and national ID, for documents that need them. */
export const COMPANY_LEGAL_NAME = 'رابین تجارت وارنا فرتاک';
export const COMPANY_NATIONAL_ID = '14009396464';

export const toPeriod = (year: number, month: number) => year * 100 + month;
export const yearOf = (period: number) => Math.floor(period / 100);
export const monthOf = (period: number) => period % 100;

export function currentPeriod(): number {
  const now = new Date();
  return toPeriod(getYear(now), getMonth(now) + 1);
}

/** `مهر ۱۴۰۵`. */
export function periodLabel(period: number | null | undefined): string {
  if (!period) return '—';
  return `${MONTHS[monthOf(period) - 1]} ${yearOf(period).toLocaleString('fa-IR', { useGrouping: false })}`;
}

/** Rial with grouping and Persian digits. */
export const rial = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : value.toLocaleString('fa-IR');

/** `+۲۵٪` / `−۵٪`, left-to-right so the sign stays in front. */
export function percentLabel(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toLocaleString('fa-IR')}٪`;
}

/** The new salary for a percent of the current one, rounded to a multiple of `roundTo`. */
export const applyPercent = (current: number, percent: number, roundTo = 1) =>
  Math.round((current * (1 + percent / 100)) / roundTo) * roundTo;

/**
 * What a person typed into a percent box, as a plain number string: Persian
 * and Arabic digits become Latin, `٫` and `,` become the decimal point, the
 * rest is dropped. A browser's number input throws Persian digits away, so
 * these fields are text inputs and go through here.
 */
export function toLatinNumber(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٫,،]/g, '.')
    .replace(/[^0-9.\-]/g, '');
}

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

/** A number below a thousand, in words. */
function underThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) parts.push(HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest >= 20) {
    parts.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10) parts.push(ONES[rest % 10]);
  } else if (rest) {
    parts.push(ONES[rest]);
  }
  return parts.join(' و ');
}

/** A whole number in Persian words: 76033523 → «هفتاد و شش میلیون و سی و سه هزار و پانصد و بیست و سه». */
export function toPersianWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'صفر';
  const groups: string[] = [];
  for (let i = 0; n > 0; i++, n = Math.floor(n / 1000)) {
    const chunk = n % 1000;
    // «هزار», not «یک هزار», but «یک میلیون».
    if (chunk) groups.unshift([i === 1 && chunk === 1 ? '' : underThousand(chunk), SCALES[i]].filter(Boolean).join(' '));
  }
  return (value < 0 ? 'منفی ' : '') + groups.join(' و ');
}

/** Fetches a file the API gives out (with the sign-in) and saves it from the browser. */
export async function downloadFile(path: string, filename: string) {
  const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!response.ok) throw new Error('دریافت فایل ناموفق بود');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(await response.blob());
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
