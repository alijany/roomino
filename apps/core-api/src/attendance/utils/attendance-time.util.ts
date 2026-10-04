import { TZDate } from '@date-fns/tz';
import { format as formatGregorian } from 'date-fns';
import {
  format as formatJalali,
  getDaysInMonth as getJalaliDaysInMonth,
  newDate as newJalaliDate,
} from 'date-fns-jalali';
import { TEHRAN_TZ } from '../attendance.constants';

/**
 * Date/time helpers for attendance.
 *
 * Two kinds of value cross this module and must never be mixed:
 *  - **civil dates** (`"YYYY-MM-DD"`, Gregorian, as seen on a Tehran wall
 *    calendar) — what an attendance row, a leave day or a holiday is *for*;
 *  - **instants** (`Date`) — when a check-in actually happened.
 *
 * Iran has had no DST since 2022, so a civil time composes into an instant
 * with a fixed `+03:30` offset.
 */

const OFFSET = '+03:30';

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Today's civil date in Tehran. */
export function tehranToday(now: Date = new Date()): string {
  return formatGregorian(new TZDate(now, TEHRAN_TZ), 'yyyy-MM-dd');
}

/** Civil date in Tehran of an instant. */
export function tehranDateOf(instant: Date): string {
  return formatGregorian(new TZDate(instant, TEHRAN_TZ), 'yyyy-MM-dd');
}

/** `"HH:mm"` of an instant in Tehran civil time. */
export function tehranClock(instant?: Date | null): string | null {
  if (!instant) return null;
  return formatGregorian(new TZDate(instant, TEHRAN_TZ), 'HH:mm');
}

/** Compose a civil date and `"HH:mm"` into an absolute instant. */
export function composeInstant(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00.000${OFFSET}`);
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 60000);
}

/** `"HH:mm"` → minutes from midnight. */
export function clockToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Iranian weekday of a civil date: 0 = شنبه … 6 = جمعه. */
export function iranWeekday(date: string): number {
  // Noon UTC keeps the Gregorian day stable regardless of the server's zone.
  const day = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return (day + 1) % 7;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of civil dates from `from` to `to`. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return dates;
}

/** Inclusive day count between two civil dates. */
export function daysInclusive(from: string, to: string): number {
  const ms =
    new Date(`${to}T12:00:00Z`).getTime() -
    new Date(`${from}T12:00:00Z`).getTime();
  return Math.round(ms / 86400000) + 1;
}

// --- Jalali ------------------------------------------------------------------
//
// date-fns-jalali reads and writes Jalali fields of a *local* Date. Building
// the Date locally and reading it back locally never crosses a zone boundary,
// so these conversions are pure civil-date arithmetic whatever TZ the server
// runs in.

/** Gregorian civil date of a Jalali date (month is 1-based). */
export function jalaliToDate(jy: number, jm: number, jd: number): string {
  return formatGregorian(newJalaliDate(jy, jm - 1, jd), 'yyyy-MM-dd');
}

function localNoon(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** `{ year, month, day }` (month 1-based) of a civil date. */
export function dateToJalali(date: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = formatJalali(localNoon(date), 'yyyy-M-d')
    .split('-')
    .map(Number);
  return { year, month, day };
}

/** Jalali `"yyyy/MM/dd"` of a civil date, with Latin digits. */
export function formatJalaliDate(date: string): string {
  return formatJalali(localNoon(date), 'yyyy/MM/dd');
}

/** Jalali weekday name of a civil date. */
export function jalaliWeekdayName(date: string): string {
  return formatJalali(localNoon(date), 'EEEE');
}

/** First and last civil dates of a Jalali month. */
export function jalaliMonthRange(
  jy: number,
  jm: number,
): { from: string; to: string } {
  const days = getJalaliDaysInMonth(newJalaliDate(jy, jm - 1, 1));
  return { from: jalaliToDate(jy, jm, 1), to: jalaliToDate(jy, jm, days) };
}

export function currentJalali(): { year: number; month: number } {
  const { year, month } = dateToJalali(tehranToday());
  return { year, month };
}

export function jalaliMonthLabel(jy: number, jm: number): string {
  return formatJalali(newJalaliDate(jy, jm - 1, 1), 'MMMM yyyy');
}

// --- geometry ------------------------------------------------------------------

/** Haversine distance in metres. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** `"HH:mm"` for a signed number of minutes (`-01:05`). */
export function formatHm(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}
