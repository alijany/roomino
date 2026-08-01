import { TZDate } from '@date-fns/tz';

/**
 * Shared meeting-domain time helpers (used by the rooms and reservations
 * domains). Iran Standard Time (Asia/Tehran) is a fixed +03:30 with no DST.
 */

export const TEHRAN_TZ = 'Asia/Tehran';

export const BOARD_START = 9 * 60; // 09:00
export const BOARD_END = 18 * 60; // 18:00
export const SLOT = 30;

/** Slot start minutes across the board: [540, 570, …, 1050]. */
export const SLOT_STARTS: number[] = (() => {
  const starts: number[] = [];
  for (let m = BOARD_START; m < BOARD_END; m += SLOT) starts.push(m);
  return starts;
})();

/** Jalali weekday labels, index 0=شنبه … 6=جمعه. */
export const WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format minutes-from-midnight as "HH:mm" (e.g. 540 → "09:00"). */
export function minutesToHHmm(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/**
 * Gregorian civil date ("YYYY-MM-DD") of an instant evaluated in Tehran.
 * NOTE: do NOT use date-fns-jalali `format` here — it yields Jalali digits.
 */
export function tehranDateString(date: Date): string {
  const z = new TZDate(date, TEHRAN_TZ);
  return `${z.getFullYear()}-${pad2(z.getMonth() + 1)}-${pad2(z.getDate())}`;
}
