import { DayFilter } from './attendance.constants';
import { AttendanceRequest, ReportDay, RequestStatus } from './attendance.types';
import { filterDays } from './attendance.util';

export type MemberDayFilter = DayFilter | 'pending';

export function filterMemberDays(days: ReportDay[], filter: MemberDayFilter) {
  return filter === 'pending'
    ? days.filter((day) => day.requests.some((request) => request.status === RequestStatus.PENDING))
    : filterDays(days, filter);
}

/** A daily request may span several days; count each request once. */
export function pendingReportRequests(days: ReportDay[]) {
  const requests = new Map<number, AttendanceRequest>();
  for (const day of days) {
    for (const request of day.requests) {
      if (request.status === RequestStatus.PENDING) requests.set(request.id, request);
    }
  }
  return [...requests.values()];
}

export function visibleMemberDays(days: ReportDay[], showFuture: boolean, newestFirst: boolean) {
  return days
    .filter((day) => showFuture || !day.isFuture)
    .sort((a, b) => (newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
}
