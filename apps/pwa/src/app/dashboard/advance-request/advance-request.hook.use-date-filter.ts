import { useState } from 'react';

export type DateFilterMode = 'all' | 'current' | 'previous' | 'custom';

export const DATE_FILTER_OPTIONS: Array<{ label: string; value: DateFilterMode }> = [
  { label: 'همه تاریخ‌ها', value: 'all' },
  { label: 'ماه جاری', value: 'current' },
  { label: 'ماه قبل', value: 'previous' },
  { label: 'بازه دلخواه', value: 'custom' },
];

/** [from, to) for the calendar month `monthsAgo` months back from today. */
function monthRange(monthsAgo: number): { from: string; to: string } {
  const cursor = new Date();
  const from = new Date(cursor.getFullYear(), cursor.getMonth() - monthsAgo, 1);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() - monthsAgo + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Shared by the personal و management مساعده screens: ماه جاری / ماه قبل /
 * بازه دلخواه, resolved to the ISO from/to pair the API filters on.
 */
export function useDateFilter() {
  const [mode, setMode] = useState<DateFilterMode>('all');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);

  const range: { from?: string; to?: string } =
    mode === 'current'
      ? monthRange(0)
      : mode === 'previous'
        ? monthRange(1)
        : mode === 'custom'
          ? { from: customFrom?.toISOString(), to: customTo?.toISOString() }
          : {};

  return { mode, setMode, customFrom, setCustomFrom, customTo, setCustomTo, range };
}
