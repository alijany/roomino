import { wrap } from '@mikro-orm/core';
import { UserEntity } from '../../user/user.entity';
import {
  ManualDirection,
  RequestStatusLabels,
  RequestTypeLabels,
} from '../attendance.constants';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { EmployeeShiftEntity } from '../entities/employee-shift.entity';
import { HolidayEntity } from '../entities/holiday.entity';
import { JobGroupEntity } from '../entities/job-group.entity';
import { LeaveBalanceEntity } from '../entities/leave-balance.entity';
import { ShiftEntity } from '../entities/shift.entity';
import { WorkPolicyEntity } from '../entities/work-policy.entity';
import { WorkplaceEntity } from '../entities/workplace.entity';
import { categoryOf } from './attendance-request.util';
import { formatJalaliDate, tehranClock } from './attendance-time.util';

/**
 * Wire shapes. Entities carry relations and internals a client has no use
 * for; these mappers make what leaves the API explicit.
 */

/** The relation if it was populated, otherwise undefined. */
const loaded = <T extends object>(ref: T | undefined): T | undefined =>
  ref && wrap(ref, true).isInitialized() ? ref : undefined;

export function toUserBrief(user?: UserEntity) {
  if (!user) return undefined;
  return { id: user.id, name: user.name, phone: user.phone };
}

export function toWorkplaceView(w: WorkplaceEntity) {
  return {
    id: w.id,
    name: w.name,
    city: w.city ?? null,
    address: w.address ?? null,
    lat: w.lat,
    lng: w.lng,
    radiusMeters: w.radiusMeters,
    active: w.active,
  };
}

export function toShiftView(shift: ShiftEntity) {
  return {
    id: shift.id,
    name: shift.name,
    year: shift.year,
    flexMinutes: shift.flexMinutes,
    dailyOvertimeCapMinutes: shift.dailyOvertimeCapMinutes ?? null,
    days: shift.days.isInitialized()
      ? shift.days.getItems().map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isActive: d.isActive,
          startTime: d.startTime ?? null,
          endTime: d.endTime ?? null,
          hasSecondPart: d.hasSecondPart,
          secondStartTime: d.secondStartTime ?? null,
          secondEndTime: d.secondEndTime ?? null,
        }))
      : [],
  };
}

export function toJobGroupView(group: JobGroupEntity, employeeCount?: number) {
  return {
    id: group.id,
    name: group.name,
    approvers: group.approvers.isInitialized()
      ? group.approvers.getItems().map(toUserBrief)
      : [],
    employeeCount: employeeCount ?? null,
  };
}

export function toWorkPolicyView(policy: WorkPolicyEntity) {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? null,
    isDefault: policy.isDefault,
    restrictApprovalTime: policy.restrictApprovalTime,
    rules: policy.rules.isInitialized()
      ? policy.rules.getItems().map((r) => ({
          id: r.id,
          requestType: r.requestType,
          period: r.period ?? null,
          year: r.year,
          monthlyCapMinutes: r.monthlyCapMinutes ?? null,
          yearlyCapMinutes: r.yearlyCapMinutes ?? null,
          carryoverCapMinutes: r.carryoverCapMinutes ?? null,
          allowOverMonthlyCap: r.allowOverMonthlyCap,
          allowOverYearlyCap: r.allowOverYearlyCap,
        }))
      : [],
  };
}

export function toEmployeeBrief(profile: EmployeeProfileEntity) {
  return {
    id: profile.id,
    userId: profile.user?.id,
    name: profile.user?.name ?? null,
    personnelCode: profile.personnelCode,
    jobTitle: profile.jobTitle ?? null,
  };
}

export function toEmployeeView(
  profile: EmployeeProfileEntity,
  currentShift?: EmployeeShiftEntity | null,
) {
  const user = profile.user;
  const workplace = loaded(profile.workplace);
  const jobGroup = loaded(profile.jobGroup);
  const policy = loaded(profile.workPolicy);

  return {
    id: profile.id,
    user: {
      id: user.id,
      name: user.name ?? null,
      phone: user.phone ?? null,
      nationalId: user.nationalId ?? null,
      profilePicture: user.profilePicture ?? null,
    },
    personnelCode: profile.personnelCode,
    jobTitle: profile.jobTitle ?? null,
    workplace: workplace ? { id: workplace.id, name: workplace.name } : null,
    jobGroup: jobGroup ? { id: jobGroup.id, name: jobGroup.name } : null,
    workPolicy: policy ? { id: policy.id, name: policy.name } : null,
    useGps: profile.useGps,
    useWifi: profile.useWifi,
    allowedDeviceType: profile.allowedDeviceType,
    trackingEnabled: profile.trackingEnabled,
    remoteDays: profile.remoteDays ?? [],
    active: profile.active,
    currentShift: currentShift
      ? {
          id: currentShift.shift.id,
          name: currentShift.shift.name,
          startDate: currentShift.startDate,
        }
      : null,
  };
}

export function toAttendanceView(a: AttendanceEntity) {
  const editor = loaded(a.editedBy);
  return {
    id: a.id,
    date: a.date,
    checkInAt: a.checkInAt ?? null,
    checkOutAt: a.checkOutAt ?? null,
    checkIn: tehranClock(a.checkInAt),
    checkOut: tehranClock(a.checkOutAt),
    checkInSource: a.checkInSource ?? null,
    checkOutSource: a.checkOutSource ?? null,
    checkInDistanceM: a.checkInDistanceM ?? null,
    checkOutDistanceM: a.checkOutDistanceM ?? null,
    status: a.status,
    workMode: a.workMode,
    editedBy: editor ? toUserBrief(editor) : null,
    editedAt: a.editedAt ?? null,
    editNote: a.editNote ?? null,
  };
}

/**
 * Jalali date or range of a request, Latin digits — the client renders them
 * in Persian. `"1405/07/01 تا 1405/07/03"`, `"1405/07/01 — 10:00 تا 12:00"`.
 */
export function periodLabel(r: AttendanceRequestEntity): string {
  if (r.dateFrom) {
    let label = formatJalaliDate(r.dateFrom);
    if (r.dateTo && r.dateTo !== r.dateFrom) {
      label += ` تا ${formatJalaliDate(r.dateTo)}`;
    }
    return label;
  }

  if (r.date) {
    let label = formatJalaliDate(r.date);
    if (r.timeFrom) {
      label += ` — ${r.timeFrom} تا ${r.timeTo}`;
    } else if (r.manualTime) {
      const direction =
        r.manualDirection === ManualDirection.OUT ? 'خروج' : 'ورود';
      label += ` — ${direction} ${r.manualTime}`;
    }
    return label;
  }

  return '—';
}

export function toRequestView(r: AttendanceRequestEntity) {
  const employee = loaded(r.employee);
  const reviewer = loaded(r.reviewedBy);

  return {
    id: r.id,
    type: r.type,
    typeLabel: RequestTypeLabels[r.type],
    category: categoryOf(r.type),
    status: r.status,
    statusLabel: RequestStatusLabels[r.status],
    dateFrom: r.dateFrom ?? null,
    dateTo: r.dateTo ?? null,
    date: r.date ?? null,
    timeFrom: r.timeFrom ?? null,
    timeTo: r.timeTo ?? null,
    manualTime: r.manualTime ?? null,
    manualDirection: r.manualDirection ?? null,
    periodLabel: periodLabel(r),
    durationMinutes: r.durationMinutes ?? null,
    description: r.description ?? null,
    reviewNote: r.reviewNote ?? null,
    reviewedBy: reviewer ? toUserBrief(reviewer) : null,
    reviewedAt: r.reviewedAt ?? null,
    createdAt: r.created_at,
    employee:
      employee && loaded(employee.user) ? toEmployeeBrief(employee) : null,
  };
}

export function toHolidayView(h: HolidayEntity) {
  return {
    id: h.id,
    date: h.date,
    jalali: formatJalaliDate(h.date),
    title: h.title,
    source: h.source,
    active: h.active,
  };
}

export function toLeaveBalanceView(b: LeaveBalanceEntity) {
  return {
    id: b.id,
    leaveType: b.leaveType,
    year: b.year,
    accruedMinutes: b.accruedMinutes,
    usedMinutes: b.usedMinutes,
    carriedOverMinutes: b.carriedOverMinutes,
    remainingMinutes: b.accruedMinutes + b.carriedOverMinutes - b.usedMinutes,
  };
}
