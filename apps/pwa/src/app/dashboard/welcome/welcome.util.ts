import { format } from 'date-fns-jalali';
import { fa, fromCivilDate } from '../attendance/attendance.util';

/** «۱۴ آبان» — a civil date as day and month, without the year. */
export function dayMonthLabel(date: string | null | undefined): string {
  if (!date) return '';
  return fa(format(fromCivilDate(date), 'd MMMM'));
}
