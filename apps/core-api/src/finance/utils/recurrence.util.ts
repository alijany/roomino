import { TZDate } from '@date-fns/tz';
import { addDays, addMonths as addGregorianMonths } from 'date-fns';
import { addMonths as addJalaliMonths } from 'date-fns-jalali';
import {
  BillingCalendar,
  RecurrenceCycle,
  TEHRAN_TZ,
} from '../finance.constants';

/**
 * Cycle arithmetic for recurring expenses.
 *
 * Two calendars, because the distinction is real here: a SaaS vendor bills on
 * Gregorian months, while rent and most local services fall on Jalali ones.
 * Advancing an Esfand-15 rent by a Gregorian month drifts off the agreed day
 * within a year.
 */

/** Months added per cycle. CUSTOM_DAYS is handled separately. */
const MONTHS_PER_CYCLE: Partial<Record<RecurrenceCycle, number>> = {
  [RecurrenceCycle.MONTHLY]: 1,
  [RecurrenceCycle.QUARTERLY]: 3,
  [RecurrenceCycle.YEARLY]: 12,
};

export function advanceDueDate(
  from: Date,
  cycle: RecurrenceCycle,
  calendar: BillingCalendar,
  cycleDays?: number,
): Date {
  if (cycle === RecurrenceCycle.CUSTOM_DAYS) {
    // A day count means the same thing in both calendars.
    return addDays(from, Math.max(1, cycleDays ?? 30));
  }

  const months = MONTHS_PER_CYCLE[cycle] ?? 1;

  return calendar === BillingCalendar.JALALI
    ? addJalaliMonths(from, months)
    : addGregorianMonths(from, months);
}

/** Midnight in Tehran for the given instant — the day boundary users mean. */
export function tehranStartOfDay(date: Date): Date {
  const zoned = new TZDate(date, TEHRAN_TZ);
  return new Date(
    new TZDate(
      zoned.getFullYear(),
      zoned.getMonth(),
      zoned.getDate(),
      0,
      0,
      0,
      TEHRAN_TZ,
    ).getTime(),
  );
}

/**
 * Whole days from today to `due`, counted in Tehran civil time.
 * Negative means overdue.
 */
export function daysUntil(due: Date, now: Date = new Date()): number {
  const a = tehranStartOfDay(now).getTime();
  const b = tehranStartOfDay(due).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * The reminder window that applies right now, or null.
 *
 * Windows are checked largest-first and compared against what has already been
 * sent this cycle, so a daily job warns once per window rather than every
 * morning between 30 days out and the due date.
 */
export function dueReminderWindow(
  due: Date,
  reminderDays: number[],
  alreadySent?: number,
  now: Date = new Date(),
): number | null {
  const remaining = daysUntil(due, now);

  if (remaining < 0) {
    return null;
  }

  const windows = [...(reminderDays ?? [])].sort((a, b) => b - a);

  for (const window of windows) {
    if (remaining <= window) {
      // Smaller number = closer to the deadline = a later window than the last.
      if (alreadySent === undefined || window < alreadySent) {
        return window;
      }
      return null;
    }
  }

  return null;
}
