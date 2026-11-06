import { formatJalaliDate, jalaliWeekdayName } from './attendance-time.util';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Latin digits → Persian, for the text people read. */
export function fa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** «شنبه ۱۴۰۵/۰۸/۱۷» */
export function dayLabel(date: string): string {
  return `${jalaliWeekdayName(date)} ${fa(formatJalaliDate(date))}`;
}

/** «۱۷:۳۰ تا ۲۳:۰۰» — several slots joined with «و». */
export function slotsLabel(slots: { start: string; end: string }[]): string {
  return slots
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => `${fa(s.start)} تا ${fa(s.end)}`)
    .join(' و ');
}
