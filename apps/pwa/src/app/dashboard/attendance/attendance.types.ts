/**
 * Wire types of the attendance API (`/attendance/**`). Dates are Gregorian
 * civil dates `"YYYY-MM-DD"` (Tehran); times are `"HH:mm"`; durations are
 * minutes.
 */

export enum RequestType {
  LEAVE_ENTITLED_DAILY = 'leave_entitled_daily',
  LEAVE_ENTITLED_HOURLY = 'leave_entitled_hourly',
  LEAVE_SICK_DAILY = 'leave_sick_daily',
  LEAVE_SICK_HOURLY = 'leave_sick_hourly',
  LEAVE_UNPAID_DAILY = 'leave_unpaid_daily',
  LEAVE_UNPAID_HOURLY = 'leave_unpaid_hourly',
  MISSION_DAILY = 'mission_daily',
  MISSION_HOURLY = 'mission_hourly',
  REMOTE_DAILY = 'remote_daily',
  REMOTE_HOURLY = 'remote_hourly',
  OVERTIME = 'overtime',
  MANUAL_ATTENDANCE = 'manual_attendance',
  OTHER = 'other',
}

export enum RequestCategory {
  LEAVE = 'leave',
  MISSION = 'mission',
  REMOTE = 'remote',
  OVERTIME = 'overtime',
  MANUAL_ATTENDANCE = 'manual_attendance',
  OTHER = 'other',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DayStatus {
  PRESENT = 'present',
  IN_PROGRESS = 'in_progress',
  INCOMPLETE = 'incomplete',
  ABSENT = 'absent',
  ON_LEAVE = 'on_leave',
  MISSION = 'mission',
  REMOTE = 'remote',
  REMOTE_PENDING = 'remote_pending',
  HOLIDAY = 'holiday',
  FUTURE = 'future',
}

export enum BoardStatus {
  ON_LEAVE = 'on_leave',
  REMOTE = 'remote',
  REMOTE_DONE = 'remote_done',
  DONE = 'done',
  WORKING = 'working',
  OFF = 'off',
  NOT_YET = 'not_yet',
  MISSING = 'missing',
}

export enum RemoteStatus {
  FIXED = 'fixed',
  APPROVED = 'approved',
  PENDING = 'pending',
}

export enum HolidaySource {
  OFFICIAL = 'official',
  MANUAL = 'manual',
}

export enum PolicyRequestType {
  LEAVE_ENTITLED = 'leave_entitled',
  LEAVE_SICK = 'leave_sick',
  LEAVE_UNPAID = 'leave_unpaid',
  MISSION = 'mission',
  OVERTIME = 'overtime',
  MANUAL_ATTENDANCE = 'manual_attendance',
}

export enum PolicyPeriod {
  DAILY = 'daily',
  HOURLY = 'hourly',
}

export enum LeaveType {
  ENTITLED = 'entitled',
  SICK = 'sick',
  UNPAID = 'unpaid',
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

export interface UserBrief {
  id: number;
  name?: string;
  phone?: string;
}

export interface NamedRef {
  id: number;
  name: string;
}

// --- setup data --------------------------------------------------------------------

export interface Workplace {
  id: number;
  name: string;
  city: string | null;
  address: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  active: boolean;
}

export type WorkplaceInput = Omit<Workplace, 'id' | 'city' | 'address'> & {
  city?: string;
  address?: string;
};

export interface ShiftDay {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  hasSecondPart: boolean;
  secondStartTime: string | null;
  secondEndTime: string | null;
}

export interface Shift {
  id: number;
  name: string;
  year: number;
  flexMinutes: number;
  dailyOvertimeCapMinutes: number | null;
  days: ShiftDay[];
}

export interface ShiftInput {
  name: string;
  year: number;
  flexMinutes?: number;
  dailyOvertimeCapMinutes?: number;
  days: Array<{
    dayOfWeek: number;
    isActive: boolean;
    startTime?: string;
    endTime?: string;
    hasSecondPart?: boolean;
    secondStartTime?: string;
    secondEndTime?: string;
  }>;
}

export interface JobGroup {
  id: number;
  name: string;
  approvers: UserBrief[];
  employeeCount: number | null;
}

export interface JobGroupInput {
  name: string;
  approverIds?: number[];
}

export interface PolicyRule {
  id?: number;
  requestType: PolicyRequestType;
  period: PolicyPeriod | null;
  year: number;
  monthlyCapMinutes: number | null;
  yearlyCapMinutes: number | null;
  carryoverCapMinutes: number | null;
  allowOverMonthlyCap: boolean;
  allowOverYearlyCap: boolean;
}

export interface WorkPolicy {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  restrictApprovalTime: boolean;
  rules: PolicyRule[];
}

export interface WorkPolicyInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  restrictApprovalTime?: boolean;
  rules: Array<Omit<PolicyRule, 'id' | 'period' | 'monthlyCapMinutes' | 'yearlyCapMinutes' | 'carryoverCapMinutes'> & {
    period?: PolicyPeriod;
    monthlyCapMinutes?: number;
    yearlyCapMinutes?: number;
    carryoverCapMinutes?: number;
  }>;
}

export interface Holiday {
  id: number;
  date: string;
  jalali: string;
  title: string;
  source: HolidaySource;
  active: boolean;
}

// --- people --------------------------------------------------------------------------

export interface EmployeeBrief {
  id: number;
  userId: number;
  name: string | null;
  personnelCode: string;
  jobTitle: string | null;
}

export interface Employee {
  id: number;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    nationalId: string | null;
    profilePicture: string | null;
  };
  personnelCode: string;
  jobTitle: string | null;
  workplace: NamedRef | null;
  jobGroup: NamedRef | null;
  workPolicy: NamedRef | null;
  useGps: boolean;
  useWifi: boolean;
  allowedDeviceType: 'any' | 'web' | 'android';
  trackingEnabled: boolean;
  remoteDays: number[];
  active: boolean;
  currentShift: { id: number; name: string; startDate: string } | null;
}

export interface LeaveBalance {
  id: number;
  leaveType: LeaveType;
  year: number;
  accruedMinutes: number;
  usedMinutes: number;
  carriedOverMinutes: number;
  remainingMinutes: number;
}

export interface EmployeeDetail extends Employee {
  shiftHistory: Array<{
    id: number;
    shift: NamedRef;
    startDate: string;
    endDate: string | null;
  }>;
  leaveBalances: LeaveBalance[];
}

export interface EmployeeInput {
  userId?: number;
  personnelCode?: string;
  jobTitle?: string;
  workplaceId?: number;
  jobGroupId?: number | null;
  workPolicyId?: number | null;
  shiftId?: number;
  shiftStartDate?: string;
  useGps?: boolean;
  remoteDays?: number[];
  active?: boolean;
}

/** Several profiles with one shared assignment — `POST /attendance/employees/batch`. */
export interface EmployeeBatchInput
  extends Omit<EmployeeInput, 'userId' | 'personnelCode' | 'jobTitle'> {
  items: Array<{ userId: number; personnelCode: string; jobTitle?: string }>;
}

export interface EmployeeFilterDto {
  page?: number;
  limit?: number;
  text?: string;
  workplaceId?: number;
  jobGroupId?: number;
  activeOnly?: boolean;
}

// --- attendance & requests -----------------------------------------------------------

export interface AttendanceRecord {
  id: number;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkIn: string | null;
  checkOut: string | null;
  checkInSource: 'gps' | 'wifi' | 'manual' | null;
  checkOutSource: 'gps' | 'wifi' | 'manual' | null;
  checkInDistanceM: number | null;
  checkOutDistanceM: number | null;
  status: string;
  workMode: 'office' | 'remote';
  editedBy: UserBrief | null;
  editedAt: string | null;
  editNote: string | null;
}

export interface AttendanceRequest {
  id: number;
  type: RequestType;
  typeLabel: string;
  category: RequestCategory;
  status: RequestStatus;
  statusLabel: string;
  dateFrom: string | null;
  dateTo: string | null;
  date: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  manualTime: string | null;
  manualDirection: 'in' | 'out' | null;
  periodLabel: string;
  durationMinutes: number | null;
  description: string | null;
  reviewNote: string | null;
  reviewedBy: UserBrief | null;
  reviewedAt: string | null;
  createdAt: string;
  employee: EmployeeBrief | null;
}

export interface RequestInput {
  type: RequestType;
  dateFrom?: string;
  dateTo?: string;
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  manualTime?: string;
  manualDirection?: 'in' | 'out';
  description?: string;
}

export interface RequestFilterDto {
  page?: number;
  limit?: number;
  text?: string;
  status?: RequestStatus;
  category?: RequestCategory;
  employeeId?: number;
}

export interface RequestListResponse {
  items: AttendanceRequest[];
  counts: Record<RequestStatus, number>;
  meta: PaginationMeta;
}

export interface CorrectionInput {
  date: string;
  checkIn: string;
  checkOut?: string;
  note: string;
}

export interface CheckResult {
  success: boolean;
  message: string;
  canRemote?: boolean;
  attendance: AttendanceRecord | null;
}

export interface MyToday {
  hasProfile: boolean;
  active?: boolean;
  isApprover: boolean;
  date?: string;
  profile?: Employee;
  workplace?: Workplace | null;
  attendance?: AttendanceRecord | null;
  holiday?: string | null;
  remoteStatus?: RemoteStatus | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  month?: {
    label: string;
    worked: number;
    overtime: number;
    absence: number;
    leave: number;
    balance: number;
  };
  pendingRequests?: number;
}

// --- reports ---------------------------------------------------------------------------

export interface Period {
  from: string;
  to: string;
  label: string;
  year?: number;
  month?: number;
}

/** A Jalali month (`y`, `m`) or a custom civil-date range. */
export interface PeriodQuery {
  y?: number;
  m?: number;
  from?: string;
  to?: string;
}

export interface ReportDay {
  date: string;
  jalali: string;
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
  holiday: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  scheduled: number;
  checkIn: string | null;
  checkOut: string | null;
  worked: number;
  delay: number;
  early: number;
  remote: number;
  overtime: number;
  leaveMinutes: number;
  status: DayStatus;
  workMode: 'office' | 'remote' | null;
  fixedRemote: boolean;
  hasPending: boolean;
  needsFix: boolean;
  fixDirection: 'in' | 'out';
  attendance: AttendanceRecord | null;
  requests: AttendanceRequest[];
}

export interface ReportSummary {
  worked: number;
  required: number;
  requiredPeriod: number;
  balance: number;
  delayCount: number;
  delayMinutes: number;
  earlyCount: number;
  earlyMinutes: number;
  overtime: number;
  leaveMinutes: number;
  absentDays: number;
  absentMinutes: number;
  incompleteDays: number;
  leaveDays: number;
  missionDays: number;
  remoteDays: number;
  remotePendingDays: number;
  remoteMinutes: number;
  presentDays: number;
}

export interface Report {
  period: Period;
  days: ReportDay[];
  summary: ReportSummary;
}

export interface BoardRow {
  employee: EmployeeBrief;
  workplace?: string | null;
  jobGroup?: string | null;
  status: BoardStatus;
  shiftStart: string | null;
  checkIn: string | null;
  checkOut: string | null;
  checkInDistanceM: number | null;
}

export interface Board {
  date: string;
  jalali: string;
  holiday: string | null;
  rows: BoardRow[];
  stats: {
    employees: number;
    present: number;
    missing: number;
    onLeave: number;
    pending: number;
  };
  pendingRequests?: AttendanceRequest[];
}

export interface PerformanceRow {
  employee: EmployeeBrief;
  workplace: string | null;
  jobGroup: string | null;
  summary: ReportSummary;
  pending: number;
}

export interface PerformanceQuery extends PeriodQuery {
  workplaceId?: number;
  jobGroupId?: number;
  text?: string;
}

export interface HolidaySyncResult {
  added: number;
  updated: number;
  source: 'api' | 'fallback';
  error: string | null;
}
