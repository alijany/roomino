import { PerformanceQuery, PerformanceRow, PeriodQuery } from './attendance.types';
import { currentJalaliMonth, latin } from './attendance.util';

export const PERFORMANCE_FILTERS = [
  { id: 'all', label: 'همه پرسنل' },
  { id: 'pending', label: 'درخواست در انتظار' },
  { id: 'attendance', label: 'غیبت / تردد ناقص' },
  { id: 'deficit', label: 'کسری کارکرد' },
] as const;
export type PerformanceFilter = (typeof PERFORMANCE_FILTERS)[number]['id'];
export type PerformanceSort = 'attention' | 'name' | 'balance' | 'worked';
export interface PerformanceView {
  filter: PerformanceFilter;
  sort: PerformanceSort;
  detailed: boolean;
}

export function filterPerformanceRows(rows: PerformanceRow[], filter: PerformanceFilter) {
  return rows.filter((row) => {
    if (filter === 'pending') return row.pending > 0;
    if (filter === 'attendance') return row.summary.absentDays > 0 || row.summary.incompleteDays > 0;
    if (filter === 'deficit') return row.summary.balance < 0;
    return true;
  });
}

export function sortPerformanceRows(rows: PerformanceRow[], sort: PerformanceSort) {
  return [...rows].sort((a, b) => {
    const byName = () =>
      (a.employee.name ?? '').localeCompare(b.employee.name ?? '', 'fa') || a.employee.id - b.employee.id;
    if (sort === 'name') return byName();
    if (sort === 'worked') return b.summary.worked - a.summary.worked || byName();
    if (sort === 'balance') return a.summary.balance - b.summary.balance || byName();
    return (
      b.pending - a.pending ||
      b.summary.incompleteDays - a.summary.incompleteDays ||
      b.summary.absentDays - a.summary.absentDays ||
      a.summary.balance - b.summary.balance ||
      byName()
    );
  });
}

export function performanceTotals(rows: PerformanceRow[]) {
  return rows.reduce(
    (total, row) => ({
      worked: total.worked + row.summary.worked,
      required: total.required + row.summary.required,
      balance: total.balance + row.summary.balance,
      delay: total.delay + row.summary.delayMinutes,
      absent: total.absent + row.summary.absentDays,
      overtime: total.overtime + row.summary.overtime,
      pending: total.pending + row.pending,
      deficit: total.deficit + Number(row.summary.balance < 0),
    }),
    { worked: 0, required: 0, balance: 0, delay: 0, absent: 0, overtime: 0, pending: 0, deficit: 0 },
  );
}

type SearchValues = Pick<URLSearchParams, 'get'>;
const positiveId = (value: string | null) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
};
const validDate = (value: string | null): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/** Keep the selected reporting period when navigating between list and detail. */
export function reportPeriodFromSearch(search: SearchValues): PeriodQuery {
  const from = search.get('from');
  const to = search.get('to');
  if (validDate(from) && validDate(to) && from <= to) return { from, to };
  const y = positiveId(search.get('y'));
  const m = positiveId(search.get('m'));
  return y && y <= 9999 && m && m <= 12 ? { y, m } : currentJalaliMonth();
}

export function performanceQueryFromSearch(search: SearchValues): PerformanceQuery {
  return {
    ...reportPeriodFromSearch(search),
    workplaceId: positiveId(search.get('workplaceId')),
    jobGroupId: positiveId(search.get('jobGroupId')),
    text: latin(search.get('text')?.trim() ?? '') || undefined,
  };
}

export function performanceViewFromSearch(search: SearchValues): PerformanceView {
  const filter = search.get('view');
  const sort = search.get('sort');
  return {
    filter: PERFORMANCE_FILTERS.some((item) => item.id === filter) ? (filter as PerformanceFilter) : 'all',
    sort: ['attention', 'name', 'balance', 'worked'].includes(sort ?? '') ? (sort as PerformanceSort) : 'attention',
    detailed: search.get('detailed') === '1',
  };
}

export function performanceHref(query: PerformanceQuery, employeeId?: number, view?: PerformanceView) {
  const search = new URLSearchParams();
  for (const key of ['y', 'm', 'from', 'to', 'workplaceId', 'jobGroupId', 'text'] as const) {
    const value = query[key];
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  if (view?.filter && view.filter !== 'all') search.set('view', view.filter);
  if (view?.sort && view.sort !== 'attention') search.set('sort', view.sort);
  if (view?.detailed) search.set('detailed', '1');
  const base = '/dashboard/attendance/performance';
  return `${base}${employeeId === undefined ? '' : `/${employeeId}`}${search.size ? `?${search}` : ''}`;
}
