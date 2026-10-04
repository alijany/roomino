/**
 * Attendance & leave — enums, labels and the few fixed numbers the module
 * runs on. Ported from the Tesmino attendance app; values are kept identical
 * so the business rules read the same in both codebases.
 */

export const TEHRAN_TZ = 'Asia/Tehran';

/** Daily leave/mission/remote work is converted to minutes at this rate. */
export const MINUTES_PER_WORKDAY = 480;

/** Day of week in the Iranian order: 0 = شنبه … 6 = جمعه. */
export const WEEKDAY_LABELS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export enum DeviceType {
  ANY = 'any',
  WEB = 'web',
  ANDROID = 'android',
}

/** How a check-in or check-out was captured. */
export enum AttendanceSource {
  GPS = 'gps',
  WIFI = 'wifi',
  MANUAL = 'manual',
}

/** Stored status of an attendance row (the report derives a richer one). */
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
  PARTIAL = 'partial',
}

/** office: checked in inside the workplace radius; remote: no radius check. */
export enum WorkMode {
  OFFICE = 'office',
  REMOTE = 'remote',
}

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

export const RequestTypeLabels: Record<RequestType, string> = {
  [RequestType.LEAVE_ENTITLED_DAILY]: 'مرخصی استحقاقی روزانه',
  [RequestType.LEAVE_ENTITLED_HOURLY]: 'مرخصی استحقاقی ساعتی',
  [RequestType.LEAVE_SICK_DAILY]: 'مرخصی استعلاجی روزانه',
  [RequestType.LEAVE_SICK_HOURLY]: 'مرخصی استعلاجی ساعتی',
  [RequestType.LEAVE_UNPAID_DAILY]: 'مرخصی بی‌حقوق روزانه',
  [RequestType.LEAVE_UNPAID_HOURLY]: 'مرخصی بی‌حقوق ساعتی',
  [RequestType.MISSION_DAILY]: 'ماموریت روزانه',
  [RequestType.MISSION_HOURLY]: 'ماموریت ساعتی',
  [RequestType.REMOTE_DAILY]: 'دورکاری روزانه',
  [RequestType.REMOTE_HOURLY]: 'دورکاری ساعتی',
  [RequestType.OVERTIME]: 'اضافه کار',
  [RequestType.MANUAL_ATTENDANCE]: 'تردد دستی',
  [RequestType.OTHER]: 'سایر',
};

/** Types an admin/approver may grant directly (created already approved). */
export const GRANT_TYPES: readonly RequestType[] = [
  RequestType.LEAVE_ENTITLED_DAILY,
  RequestType.LEAVE_ENTITLED_HOURLY,
  RequestType.LEAVE_SICK_DAILY,
  RequestType.LEAVE_SICK_HOURLY,
  RequestType.LEAVE_UNPAID_DAILY,
  RequestType.LEAVE_UNPAID_HOURLY,
  RequestType.REMOTE_DAILY,
  RequestType.REMOTE_HOURLY,
];

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

export const RequestStatusLabels: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: 'در دست بررسی',
  [RequestStatus.APPROVED]: 'تایید شده',
  [RequestStatus.REJECTED]: 'رد شده',
};

export enum ManualDirection {
  IN = 'in',
  OUT = 'out',
}

export enum LeaveType {
  ENTITLED = 'entitled',
  SICK = 'sick',
  UNPAID = 'unpaid',
}

export const LeaveTypeLabels: Record<LeaveType, string> = {
  [LeaveType.ENTITLED]: 'استحقاقی',
  [LeaveType.SICK]: 'استعلاجی',
  [LeaveType.UNPAID]: 'بی‌حقوق',
};

/** What a work-policy rule caps. */
export enum PolicyRequestType {
  LEAVE_ENTITLED = 'leave_entitled',
  LEAVE_SICK = 'leave_sick',
  LEAVE_UNPAID = 'leave_unpaid',
  MISSION = 'mission',
  OVERTIME = 'overtime',
  MANUAL_ATTENDANCE = 'manual_attendance',
}

export const PolicyRequestTypeLabels: Record<PolicyRequestType, string> = {
  [PolicyRequestType.LEAVE_ENTITLED]: 'مرخصی استحقاقی',
  [PolicyRequestType.LEAVE_SICK]: 'مرخصی استعلاجی',
  [PolicyRequestType.LEAVE_UNPAID]: 'مرخصی بی‌حقوق',
  [PolicyRequestType.MISSION]: 'ماموریت',
  [PolicyRequestType.OVERTIME]: 'اضافه کار',
  [PolicyRequestType.MANUAL_ATTENDANCE]: 'تردد دستی',
};

export enum PolicyPeriod {
  DAILY = 'daily',
  HOURLY = 'hourly',
}

export enum HolidaySource {
  /** Fetched from the national calendar. */
  OFFICIAL = 'official',
  /** Entered by an admin. */
  MANUAL = 'manual',
}

/** Status of a day in the attendance report — derived, never stored. */
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

export const DayStatusLabels: Record<DayStatus, string> = {
  [DayStatus.PRESENT]: 'حاضر',
  [DayStatus.IN_PROGRESS]: 'در حال کار',
  [DayStatus.INCOMPLETE]: 'ناقص',
  [DayStatus.ABSENT]: 'غایب',
  [DayStatus.ON_LEAVE]: 'مرخصی',
  [DayStatus.MISSION]: 'ماموریت',
  [DayStatus.REMOTE]: 'دورکاری',
  [DayStatus.REMOTE_PENDING]: 'دورکاری (در انتظار تایید)',
  [DayStatus.HOLIDAY]: 'تعطیل',
  [DayStatus.FUTURE]: '—',
};

/** Today's status of a person on the live board (admin dashboard, my team). */
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

/** Remote-work standing for a day: a fixed weekly day, or a daily request. */
export enum RemoteStatus {
  FIXED = 'fixed',
  APPROVED = 'approved',
  PENDING = 'pending',
}
