import { format } from 'date-fns-jalali';

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
