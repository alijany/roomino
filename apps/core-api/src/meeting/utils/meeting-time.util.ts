import { TZDate } from '@date-fns/tz';

/**
 * Time helpers for the meeting-room domain.
 *
 * Iran Standard Time (Asia/Tehran) is a fixed +03:30 offset with no DST, so we
 * can compose civil times into absolute instants directly with the offset and
 * read civil fields back via a Tehran-zoned `TZDate`.
 */

export const TEHRAN_TZ = 'Asia/Tehran';

/** Availability board bounds and slot granularity (minutes-from-midnight). */
export const BOARD_START = 9 * 60; // 09:00 = 540
export const BOARD_END = 18 * 60; // 18:00 = 1080
export const SLOT = 30;

/** Slot start minutes across the board: [540, 570, …, 1050]. */
export const SLOT_STARTS: number[] = (() => {
  const starts: number[] = [];
  for (let m = BOARD_START; m < BOARD_END; m += SLOT) starts.push(m);
  return starts;
})();

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format minutes-from-midnight as "HH:mm" (e.g. 540 → "09:00"). */
export function minutesToHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * Compose a Tehran civil date + minutes-from-midnight into an absolute instant.
 * @param date Gregorian civil date in Tehran, "YYYY-MM-DD".
 * @param minutes Minutes from midnight (Tehran civil time).
 */
export function composeTehranInstant(date: string, minutes: number): Date {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return new Date(`${date}T${pad2(h)}:${pad2(m)}:00.000+03:30`);
}

/** Start of the Tehran civil day for the given "YYYY-MM-DD" date. */
export function tehranDayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000+03:30`);
}

/** End of the Tehran civil day for the given "YYYY-MM-DD" date. */
export function tehranDayEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999+03:30`);
}

/** Jalali weekday of an instant evaluated in Tehran: 0=شنبه … 6=جمعه. */
export function toJalaliWeekday(instant: Date): number {
  const z = new TZDate(instant, TEHRAN_TZ);
  return (z.getDay() + 1) % 7;
}

/** Minutes-from-midnight of an instant evaluated in Tehran civil time. */
export function minutesOfDayTehran(instant: Date): number {
  const z = new TZDate(instant, TEHRAN_TZ);
  return z.getHours() * 60 + z.getMinutes();
}
