import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { withQuery } from '@/libs/api/api.util.query';
import {
  deleteFetcher,
  fetcher,
  patchFetcher,
  postFetcher,
} from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  AttendanceRecord,
  AttendanceRequest,
  Board,
  CheckResult,
  DeclareResult,
  CorrectionInput,
  Employee,
  EmployeeDetail,
  EmployeeFilterDto,
  EmployeeBatchInput,
  EmployeeInput,
  Holiday,
  HolidaySource,
  HolidaySyncResult,
  JobGroup,
  JobGroupInput,
  LeaveBalance,
  MaintenanceSummary,
  MyToday,
  PaginationMeta,
  PerformanceQuery,
  PerformanceRow,
  Period,
  PeriodQuery,
  Report,
  RequestAttachment,
  RequestFilterDto,
  RequestInput,
  RequestListResponse,
  ResetResult,
  ResetScope,
  ScheduleMode,
  SelfDeclared,
  Shift,
  ShiftInput,
  UserBrief,
  WorkPolicy,
  WorkPolicyInput,
  Workplace,
  WorkplaceInput,
} from './attendance.types';

type Query = Record<string, never>;
const q = (path: string, query?: object) => withQuery(path, query as Query);

/** A mutation whose URL depends on its argument. */
function useDynamicMutation<A, R>(key: string, run: (arg: A) => Promise<R>) {
  return useSwrMutationHelper(
    useSWRMutation(key, (_key: string, { arg }: { arg: A }) => run(arg)),
  );
}

// --- me ---------------------------------------------------------------------------------

export function useMyToday() {
  return useSwrHelper(useSWR<MyToday>('/attendance/me', fetcher));
}

export function useCheckIn() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/attendance/me/check-in',
      postFetcher<{ lat?: number; lng?: number; remote?: boolean }, CheckResult>,
    ),
  );
}

export function useCheckOut() {
  return useSwrMutationHelper(
    useSWRMutation('/attendance/me/check-out', postFetcher<{ lat?: number; lng?: number }, CheckResult>),
  );
}

export function useMyReport(period: PeriodQuery) {
  return useSwrHelper(useSWR<Report>(q('/attendance/me/report', period), fetcher));
}

export function useMyBalances() {
  return useSwrHelper(useSWR<{ items: LeaveBalance[] }>('/attendance/me/balances', fetcher));
}

export function useMyRequests(filters: RequestFilterDto) {
  return useSwrHelper(
    useSWR<RequestListResponse>(q('/attendance/me/requests', filters), fetcher),
  );
}

export function useSubmitRequest() {
  return useSwrMutationHelper(
    useSWRMutation('/attendance/me/requests', postFetcher<RequestInput, AttendanceRequest>),
  );
}

/** «امروز هستم» — the one tap that replaces check-in in «بدون ثبت». */
export function useDeclarePresence() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/attendance/me/presence',
      postFetcher<{ lat?: number; lng?: number; remote?: boolean }, DeclareResult>,
    ),
  );
}

export function useWithdrawPresence() {
  return useDynamicMutation('/attendance/me/presence/withdraw', () =>
    deleteFetcher<{ declared: boolean }>('/attendance/me/presence'),
  );
}

export function useCancelRequest() {
  return useDynamicMutation('/attendance/me/requests/cancel', (id: number) =>
    deleteFetcher<{ success: boolean }>(`/attendance/me/requests/${id}`),
  );
}

// --- request attachments ------------------------------------------------------------------

/** Pass `null` to skip the fetch (no request open). */
export function useRequestAttachments(requestId: number | null) {
  return useSwrHelper(
    useSWR<{ items: RequestAttachment[] }>(
      requestId ? `/attendance/request-attachments/${requestId}` : null,
      fetcher,
    ),
  );
}

export function useUploadRequestAttachment() {
  return useDynamicMutation(
    '/attendance/request-attachments/upload',
    ({ requestId, file }: { requestId: number; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      // Not postFetcher: multipart must not carry a JSON content-type header.
      return fetcher<RequestAttachment>(`/attendance/request-attachments/${requestId}`, {
        method: 'POST',
        body: formData,
      });
    },
  );
}

export function useDeleteRequestAttachment() {
  return useDynamicMutation(
    '/attendance/request-attachments/delete',
    ({ requestId, id }: { requestId: number; id: number }) =>
      deleteFetcher<{ success: boolean }>(`/attendance/request-attachments/${requestId}/${id}`),
  );
}

// --- review (admin / HR) ------------------------------------------------------------------

export function useRequests(filters: RequestFilterDto) {
  return useSwrHelper(useSWR<RequestListResponse>(q('/attendance/requests', filters), fetcher));
}

/**
 * Approve/reject through the admin queue or a team approver's route — the
 * backend checks a different rule for each, so the caller picks the base.
 */
export type ReviewBase = '/attendance/requests' | '/attendance/team/requests';

export function useApproveRequest(base: ReviewBase) {
  return useDynamicMutation(`${base}/approve`, (id: number) =>
    postFetcher<Record<string, never>, AttendanceRequest>(`${base}/${id}/approve`, { arg: {} }),
  );
}

export type RequestEdit = Partial<
  Pick<RequestInput, 'dateFrom' | 'dateTo' | 'date' | 'timeFrom' | 'timeTo' | 'manualTime'>
>;

/** A reviewer's correction of a pending request's date or time. */
export function useEditRequest(base: ReviewBase) {
  return useDynamicMutation(`${base}/edit`, ({ id, data }: { id: number; data: RequestEdit }) =>
    patchFetcher<RequestEdit, AttendanceRequest>(`${base}/${id}`, { arg: data }),
  );
}

export function useRejectRequest(base: ReviewBase) {
  return useDynamicMutation(`${base}/reject`, ({ id, note }: { id: number; note: string }) =>
    postFetcher<{ note: string }, AttendanceRequest>(`${base}/${id}/reject`, { arg: { note } }),
  );
}

export function useDeleteRequest() {
  return useDynamicMutation('/attendance/requests/delete', (id: number) =>
    deleteFetcher<{ success: boolean }>(`/attendance/requests/${id}`),
  );
}

// --- reports ------------------------------------------------------------------------------

export function useBoard() {
  return useSwrHelper(useSWR<Board>('/attendance/reports/board', fetcher, { refreshInterval: 60000 }));
}

export function usePerformance(query: PerformanceQuery) {
  return useSwrHelper(
    useSWR<{ period: Period; items: PerformanceRow[] }>(
      q('/attendance/reports/performance', query),
      fetcher,
    ),
  );
}

export function useEmployeeReport(id: number | undefined, period: PeriodQuery) {
  return useSwrHelper(
    useSWR<Report>(id ? q(`/attendance/reports/employees/${id}`, period) : null, fetcher),
  );
}

/** Corrections go through the admin route or the team route. */
export type CorrectionBase = '/attendance/reports/employees' | '/attendance/team/members';

export function useCorrectAttendance(base: CorrectionBase) {
  return useDynamicMutation(
    `${base}/attendance`,
    ({ id, data }: { id: number; data: CorrectionInput }) =>
      postFetcher<CorrectionInput, AttendanceRecord>(`${base}/${id}/attendance`, { arg: data }),
  );
}

/** «حاضر بود»: confirm days a person in «بدون ثبت» didn't declare. */
export function useConfirmPresence(base: CorrectionBase) {
  return useDynamicMutation(
    `${base}/presence`,
    ({ id, dates, note }: { id: number; dates: string[]; note?: string }) =>
      postFetcher<{ dates: string[]; note?: string }, { confirmed: number }>(
        `${base}/${id}/presence`,
        { arg: { dates, note } },
      ),
  );
}

export function useRevokePresence(base: CorrectionBase) {
  return useDynamicMutation(
    `${base}/presence/revoke`,
    ({ id, date }: { id: number; date: string }) =>
      deleteFetcher<{ success: boolean }>(`${base}/${id}/presence?date=${date}`),
  );
}

export function useGrant() {
  return useDynamicMutation(
    '/attendance/reports/employees/grants',
    ({ id, data }: { id: number; data: RequestInput }) =>
      postFetcher<RequestInput, AttendanceRequest>(`/attendance/reports/employees/${id}/grants`, {
        arg: data,
      }),
  );
}

// --- team ------------------------------------------------------------------------------------

export function useTeamBoard(text?: string) {
  return useSwrHelper(
    useSWR<Board>(q('/attendance/team/board', { text }), fetcher, { refreshInterval: 60000 }),
  );
}

export function useTeamRequests(filters: RequestFilterDto) {
  return useSwrHelper(
    useSWR<RequestListResponse>(q('/attendance/team/requests', filters), fetcher),
  );
}

export function useTeamMember(id?: number) {
  return useSwrHelper(useSWR<Employee>(id ? `/attendance/team/members/${id}` : null, fetcher));
}

export function useTeamMemberReport(id: number | undefined, period: PeriodQuery) {
  return useSwrHelper(
    useSWR<Report>(id ? q(`/attendance/team/members/${id}/report`, period) : null, fetcher),
  );
}

export function useUpdateTeamMember() {
  return useDynamicMutation(
    '/attendance/team/members/update',
    ({ id, data }: { id: number; data: Pick<EmployeeInput, 'shiftId' | 'shiftStartDate' | 'remoteDays' | 'active'> }) =>
      patchFetcher<typeof data, Employee>(`/attendance/team/members/${id}`, { arg: data }),
  );
}

// --- employees -------------------------------------------------------------------------------

export function useEmployees(filters: EmployeeFilterDto) {
  return useSwrHelper(
    useSWR<{ items: Employee[]; meta: PaginationMeta }>(q('/attendance/employees', filters), fetcher),
  );
}

export function useEmployee(id?: number) {
  return useSwrHelper(useSWR<EmployeeDetail>(id ? `/attendance/employees/${id}` : null, fetcher));
}

export function useEmployeeCandidates(text: string, enabled: boolean, limit?: number) {
  return useSwrHelper(
    useSWR<{ items: Array<UserBrief & { nationalId: string | null }> }>(
      enabled ? q('/attendance/employees/candidates', { text: text || undefined, limit }) : null,
      fetcher,
    ),
  );
}

export function useSaveEmployee() {
  return useDynamicMutation(
    '/attendance/employees/save',
    ({ id, data }: { id?: number; data: EmployeeInput }) =>
      id
        ? patchFetcher<EmployeeInput, Employee>(`/attendance/employees/${id}`, { arg: data })
        : postFetcher<EmployeeInput, Employee>('/attendance/employees', { arg: data }),
  );
}

export function useBatchCreateEmployees() {
  return useDynamicMutation('/attendance/employees/batch', (data: EmployeeBatchInput) =>
    postFetcher<EmployeeBatchInput, { created: number; ids: number[] }>('/attendance/employees/batch', { arg: data }),
  );
}

// --- setup data ------------------------------------------------------------------------------

export function useWorkplaces() {
  return useSwrHelper(useSWR<{ items: Workplace[] }>('/attendance/workplaces', fetcher));
}

export function useSaveWorkplace() {
  return useDynamicMutation(
    '/attendance/workplaces/save',
    ({ id, data }: { id?: number; data: Partial<WorkplaceInput> }) =>
      id
        ? patchFetcher<Partial<WorkplaceInput>, Workplace>(`/attendance/workplaces/${id}`, { arg: data })
        : postFetcher<Partial<WorkplaceInput>, Workplace>('/attendance/workplaces', { arg: data }),
  );
}

export function useDeleteWorkplace() {
  return useDynamicMutation('/attendance/workplaces/delete', (id: number) =>
    deleteFetcher<{ success: boolean; deactivated: boolean }>(`/attendance/workplaces/${id}`),
  );
}

export function useShifts() {
  return useSwrHelper(useSWR<{ items: Shift[] }>('/attendance/shifts', fetcher));
}

export function useSaveShift() {
  return useDynamicMutation('/attendance/shifts/save', ({ id, data }: { id?: number; data: ShiftInput }) =>
    id
      ? patchFetcher<ShiftInput, Shift>(`/attendance/shifts/${id}`, { arg: data })
      : postFetcher<ShiftInput, Shift>('/attendance/shifts', { arg: data }),
  );
}

export function useDeleteShift() {
  return useDynamicMutation('/attendance/shifts/delete', (id: number) =>
    deleteFetcher<{ success: boolean }>(`/attendance/shifts/${id}`),
  );
}

export function useJobGroups() {
  return useSwrHelper(useSWR<{ items: JobGroup[] }>('/attendance/job-groups', fetcher));
}

export function useApproverCandidates(text: string, enabled: boolean) {
  return useSwrHelper(
    useSWR<{ items: UserBrief[] }>(
      enabled ? q('/attendance/job-groups/approver-candidates', { text: text || undefined }) : null,
      fetcher,
    ),
  );
}

export function useSaveJobGroup() {
  return useDynamicMutation(
    '/attendance/job-groups/save',
    ({ id, data }: { id?: number; data: JobGroupInput }) =>
      id
        ? patchFetcher<JobGroupInput, JobGroup>(`/attendance/job-groups/${id}`, { arg: data })
        : postFetcher<JobGroupInput, JobGroup>('/attendance/job-groups', { arg: data }),
  );
}

export function useDeleteJobGroup() {
  return useDynamicMutation('/attendance/job-groups/delete', (id: number) =>
    deleteFetcher<{ success: boolean }>(`/attendance/job-groups/${id}`),
  );
}

export function useWorkPolicies() {
  return useSwrHelper(useSWR<{ items: WorkPolicy[] }>('/attendance/work-policies', fetcher));
}

export function useSaveWorkPolicy() {
  return useDynamicMutation(
    '/attendance/work-policies/save',
    ({ id, data }: { id?: number; data: WorkPolicyInput }) =>
      id
        ? patchFetcher<WorkPolicyInput, WorkPolicy>(`/attendance/work-policies/${id}`, { arg: data })
        : postFetcher<WorkPolicyInput, WorkPolicy>('/attendance/work-policies', { arg: data }),
  );
}

export function useDeleteWorkPolicy() {
  return useDynamicMutation('/attendance/work-policies/delete', (id: number) =>
    deleteFetcher<{ success: boolean }>(`/attendance/work-policies/${id}`),
  );
}

// --- holidays --------------------------------------------------------------------------------

export function useHolidays(filters: { year?: number; month?: number; source?: HolidaySource; upcoming?: number }) {
  return useSwrHelper(useSWR<{ items: Holiday[] }>(q('/attendance/holidays', filters), fetcher));
}

export function useSaveHoliday() {
  return useDynamicMutation(
    '/attendance/holidays/save',
    ({ id, data }: { id?: number; data: { title: string; date: string; active?: boolean } }) =>
      id
        ? patchFetcher<typeof data, Holiday>(`/attendance/holidays/${id}`, { arg: data })
        : postFetcher<typeof data, Holiday>('/attendance/holidays', { arg: data }),
  );
}

export function useToggleHoliday() {
  return useDynamicMutation('/attendance/holidays/toggle', (id: number) =>
    postFetcher<Record<string, never>, Holiday>(`/attendance/holidays/${id}/toggle`, { arg: {} }),
  );
}

export function useDeleteHoliday() {
  return useDynamicMutation('/attendance/holidays/delete', (id: number) =>
    deleteFetcher<{ success: boolean }>(`/attendance/holidays/${id}`),
  );
}

export function useSyncHolidays() {
  return useSwrMutationHelper(
    useSWRMutation('/attendance/holidays/sync', postFetcher<{ year: number }, HolidaySyncResult>),
  );
}

// --- maintenance (admin) -----------------------------------------------------------------

export function useMaintenanceSummary() {
  return useSwrHelper(useSWR<MaintenanceSummary>('/attendance/maintenance', fetcher));
}

export function useUpdateScheduleMode() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/attendance/maintenance/schedule-mode',
      patchFetcher<{ enabled: boolean; note?: string }, ScheduleMode>,
    ),
  );
}

export function useUpdateSelfDeclared() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/attendance/maintenance/self-declared',
      patchFetcher<{ enabled: boolean }, SelfDeclared>,
    ),
  );
}

export function useResetAttendance() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/attendance/maintenance/reset',
      postFetcher<{ scope: ResetScope; confirm: string }, ResetResult>,
    ),
  );
}
