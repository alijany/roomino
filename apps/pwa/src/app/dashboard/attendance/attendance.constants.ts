import { BadgeTone } from '@/ui/atoms/ui.badge';
import {
  AttendanceMode,
  BoardStatus,
  DayStatus,
  LeaveType,
  PolicyPeriod,
  PolicyRequestType,
  RemoteStatus,
  RequestCategory,
  RequestStatus,
  RequestType,
} from './attendance.types';

/** Iranian week order: index 0 = شنبه … 6 = جمعه. */
export const WEEKDAY_LABELS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
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

/** Types an admin/HR can grant directly from an employee's report. */
export const GRANT_TYPES: RequestType[] = [
  RequestType.LEAVE_ENTITLED_DAILY,
  RequestType.LEAVE_ENTITLED_HOURLY,
  RequestType.LEAVE_SICK_DAILY,
  RequestType.LEAVE_SICK_HOURLY,
  RequestType.LEAVE_UNPAID_DAILY,
  RequestType.LEAVE_UNPAID_HOURLY,
  RequestType.REMOTE_DAILY,
  RequestType.REMOTE_HOURLY,
];

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  [RequestCategory.LEAVE]: 'مرخصی',
  [RequestCategory.MISSION]: 'ماموریت',
  [RequestCategory.REMOTE]: 'دورکاری',
  [RequestCategory.OVERTIME]: 'اضافه کار',
  [RequestCategory.MANUAL_ATTENDANCE]: 'تردد',
  [RequestCategory.OTHER]: 'سایر',
};

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: BadgeTone }> = {
  [RequestStatus.PENDING]: { label: 'در دست بررسی', tone: 'warning' },
  [RequestStatus.APPROVED]: { label: 'تایید شده', tone: 'success' },
  [RequestStatus.REJECTED]: { label: 'رد شده', tone: 'danger' },
};

export const DAY_STATUS_META: Record<DayStatus, { label: string; tone: BadgeTone }> = {
  [DayStatus.PRESENT]: { label: 'حاضر', tone: 'success' },
  [DayStatus.IN_PROGRESS]: { label: 'در حال کار', tone: 'info' },
  [DayStatus.INCOMPLETE]: { label: 'ناقص', tone: 'warning' },
  [DayStatus.ABSENT]: { label: 'غایب', tone: 'danger' },
  [DayStatus.ON_LEAVE]: { label: 'مرخصی', tone: 'info' },
  [DayStatus.MISSION]: { label: 'ماموریت', tone: 'info' },
  [DayStatus.REMOTE]: { label: 'دورکاری', tone: 'success' },
  [DayStatus.REMOTE_PENDING]: { label: 'دورکاری (در انتظار تایید)', tone: 'warning' },
  [DayStatus.BY_SCHEDULE]: { label: 'طبق شیفت', tone: 'success' },
  [DayStatus.HOLIDAY]: { label: 'تعطیل', tone: 'muted' },
  [DayStatus.AWAITING_DECLARATION]: { label: 'در انتظار اعلام', tone: 'warning' },
  [DayStatus.NO_SHIFT]: { label: 'بدون شیفت', tone: 'muted' },
  [DayStatus.FUTURE]: { label: '—', tone: 'neutral' },
};

export const BOARD_STATUS_META: Record<BoardStatus, { label: string; tone: BadgeTone }> = {
  [BoardStatus.WORKING]: { label: 'در محل کار', tone: 'success' },
  [BoardStatus.DONE]: { label: 'خروج زده', tone: 'neutral' },
  [BoardStatus.REMOTE]: { label: 'دورکاری', tone: 'info' },
  [BoardStatus.REMOTE_DONE]: { label: 'دورکاری (پایان)', tone: 'neutral' },
  [BoardStatus.ON_LEAVE]: { label: 'مرخصی', tone: 'info' },
  [BoardStatus.BY_SCHEDULE]: { label: 'طبق شیفت', tone: 'success' },
  [BoardStatus.AWAITING]: { label: 'در انتظار اعلام', tone: 'warning' },
  [BoardStatus.NOT_YET]: { label: 'هنوز شروع نشده', tone: 'muted' },
  [BoardStatus.OFF]: { label: 'بدون شیفت', tone: 'muted' },
  [BoardStatus.MISSING]: { label: 'ورود ثبت نشده', tone: 'danger' },
};

export const REMOTE_STATUS_LABELS: Record<RemoteStatus, string> = {
  [RemoteStatus.FIXED]: 'امروز روز دورکاری ثابت شماست',
  [RemoteStatus.APPROVED]: 'دورکاری امروز شما تایید شده است',
  [RemoteStatus.PENDING]: 'درخواست دورکاری امروز در انتظار تایید است',
};

export const POLICY_TYPE_LABELS: Record<PolicyRequestType, string> = {
  [PolicyRequestType.LEAVE_ENTITLED]: 'مرخصی استحقاقی',
  [PolicyRequestType.LEAVE_SICK]: 'مرخصی استعلاجی',
  [PolicyRequestType.LEAVE_UNPAID]: 'مرخصی بی‌حقوق',
  [PolicyRequestType.MISSION]: 'ماموریت',
  [PolicyRequestType.OVERTIME]: 'اضافه کار',
  [PolicyRequestType.MANUAL_ATTENDANCE]: 'تردد دستی',
};

export const POLICY_PERIOD_LABELS: Record<PolicyPeriod, string> = {
  [PolicyPeriod.DAILY]: 'روزانه',
  [PolicyPeriod.HOURLY]: 'ساعتی',
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  [LeaveType.ENTITLED]: 'استحقاقی',
  [LeaveType.SICK]: 'استعلاجی',
  [LeaveType.UNPAID]: 'بی‌حقوق',
};

/** Day-list filters of the attendance report, as in Tesmino. */
export const DAY_FILTERS = [
  { id: 'all', label: 'همه روزها' },
  { id: 'issues', label: 'نیازمند اصلاح' },
  { id: 'delay', label: 'تاخیر' },
  { id: 'early', label: 'تعجیل' },
  { id: 'absent', label: 'غیبت' },
  { id: 'leave', label: 'مرخصی و ماموریت' },
  { id: 'remote', label: 'دورکاری' },
] as const;

export type DayFilter = (typeof DAY_FILTERS)[number]['id'];

/** Supporting documents on a request — mirrors the server's limits. */
export const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 5;

/** A full day of leave/mission/remote work counts as this many minutes (server rule). */
export const MINUTES_PER_WORKDAY = 480;

/** The three ways presence is recorded, with what each one means for the person. */
export const ATTENDANCE_MODE_META: Record<
  AttendanceMode,
  { label: string; tone: BadgeTone; summary: string; detail: string }
> = {
  [AttendanceMode.TRACKED]: {
    label: 'ساعت‌دار',
    tone: 'info',
    summary: 'ورود و خروج، تاخیر و اضافه‌کار',
    detail:
      'ورود و خروج را ثبت می‌کند و تاخیر و تعجیل حساب می‌شود. اگر بعد از پایان شیفت بماند: زیر ۳۰ دقیقه حساب نمی‌شود، تا ۶۰ دقیقه اضافه‌کار خودکار ثبت می‌شود و بیشتر از آن برای تایید مدیر پیشنهاد می‌شود.',
  },
  [AttendanceMode.FLEXIBLE]: {
    label: 'منعطف',
    tone: 'success',
    summary: 'فقط مجموع ساعت کار',
    detail:
      'ورود و خروج را ثبت می‌کند ولی ساعت آمدن و رفتن مهم نیست: تاخیر و تعجیل ندارد و فقط مجموع ساعت کارش با ساعت شیفت سنجیده می‌شود. اضافه‌کار فقط با درخواست.',
  },
  [AttendanceMode.UNTRACKED]: {
    label: 'بدون ثبت',
    tone: 'muted',
    summary: 'هر روز «امروز هستم» را می‌زند',
    detail:
      'ورود و خروج ندارد. هر روز کاری «امروز هستم» را می‌زند. روزی که اعلام نشود و مرخصی یا ماموریتی هم نباشد غیبت حساب می‌شود، مگر مدیر در بازبینی آخر ماه «حاضر بود» را ثبت کند.',
  },
};

export const ATTENDANCE_MODES = [
  AttendanceMode.TRACKED,
  AttendanceMode.FLEXIBLE,
  AttendanceMode.UNTRACKED,
] as const;
