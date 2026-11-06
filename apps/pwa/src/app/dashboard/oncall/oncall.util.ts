import { currentJalaliMonth, fa, jalaliMonthName, tehranToday, fromCivilDate } from '../attendance/attendance.util';
import { format as formatJalali } from 'date-fns-jalali';
import { OnCallDayType, OnCallEntry, OnCallSlot } from './oncall.types';

export const DAY_TYPE_LABELS: Record<OnCallDayType, string> = {
  normal: 'روز عادی',
  thursday: 'پنج‌شنبه',
  friday: 'جمعه',
  holiday: 'تعطیل رسمی',
};

/** Cell tint per kind of day. */
export const DAY_TYPE_TINT: Record<OnCallDayType, string> = {
  normal: 'bg-white',
  thursday: 'bg-amber-50/60',
  friday: 'bg-sky-50/70',
  holiday: 'bg-rose-50/70',
};

export const WEEKDAY_SHORT = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

/** The period a date falls in, as the Jalali year and month it starts in. */
export function periodContaining(startDay: number, date = tehranToday()) {
  const day = Number(formatJalali(fromCivilDate(date), 'd'));
  const { y, m } = currentJalaliMonth();
  if (day >= startDay) return { year: y, month: m };
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
}

export function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${fa(h)}:${fa(String(m).padStart(2, '0'))}` : fa(h);
}

export const entryMinutes = (e: { start: string; end: string }) => clockMinutes(e.end) - clockMinutes(e.start);

export function clockMinutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
}

export const clockLabel = (clock: string) => fa(clock);

/** True when the entries are exactly the day's default slots for one person. */
export function isDefaultFor(entries: OnCallEntry[], slots: OnCallSlot[]): boolean {
  if (entries.length !== slots.length) return false;
  return entries.every((e, i) => e.start === slots[i].start && e.end === slots[i].end);
}

export function periodLabel(year: number, month: number, startDay: number): string {
  const next = month === 12 ? 1 : month + 1;
  return `${fa(startDay)} ${jalaliMonthName(month)} تا ${fa(startDay - 1)} ${jalaliMonthName(next)} ${fa(month === 12 ? year + 1 : year)}`;
}
