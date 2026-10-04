import { BadgeTone } from '@/ui/atoms/ui.badge';
import {
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
  [DayStatus.HOLIDAY]: { label: 'تعطیل', tone: 'muted' },
  [DayStatus.FUTURE]: { label: '—', tone: 'neutral' },
};

export const BOARD_STATUS_META: Record<BoardStatus, { label: string; tone: BadgeTone }> = {
  [BoardStatus.WORKING]: { label: 'در محل کار', tone: 'success' },
  [BoardStatus.DONE]: { label: 'خروج زده', tone: 'neutral' },
  [BoardStatus.REMOTE]: { label: 'دورکاری', tone: 'info' },
  [BoardStatus.REMOTE_DONE]: { label: 'دورکاری (پایان)', tone: 'neutral' },
  [BoardStatus.ON_LEAVE]: { label: 'مرخصی', tone: 'info' },
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
