import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import {
  AttendanceMode,
  AUTO_OVERTIME_AUTO_APPROVE_MAX_MINUTES,
  AUTO_OVERTIME_MIN_MINUTES,
  RequestCategory,
  RequestStatus,
  RequestType,
} from '../attendance.constants';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { categoryOf, isHourly } from '../utils/attendance-request.util';
import { scheduleFor, shiftOn } from '../utils/attendance-shift.util';
import {
  clockToMinutes,
  minutesBetween,
  tehranClock,
} from '../utils/attendance-time.util';
import { AttendanceModeService } from './attendance-mode.service';
import { AttendanceNotificationService } from './attendance-notification.service';
import { EmployeeService } from './employee.service';
import { HolidayService } from './holiday.service';

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export interface OvertimeSuggestion {
  id: number;
  minutes: number;
  timeFrom: string;
  timeTo: string;
  /** Recorded as approved at once, or waiting for the approver. */
  status: RequestStatus.APPROVED | RequestStatus.PENDING;
}

/** Marks overtime the system approved itself — see `autoApproved`. */
const AUTO_APPROVED_NOTE = 'ثبت خودکار: بین ۳۰ تا ۶۰ دقیقه پس از پایان شیفت';

/** Recorded by the system, never decided by a person. */
const autoApproved = (r: AttendanceRequestEntity) =>
  r.autoSuggested && r.status === RequestStatus.APPROVED && !r.reviewedBy;

/**
 * Overtime for people who check in and out («ساعت‌دار»), from how long past
 * the shift's end they checked out:
 *
 * - under 30 minutes: nothing;
 * - 30 to 60 minutes: recorded as approved overtime at once, marked
 *   `autoSuggested`;
 * - more than 60 minutes: a *pending* request, marked `autoSuggested`, for
 *   their approver to confirm or reject with one tap. Until then it isn't
 *   overtime — staying late isn't by itself.
 *
 * `sync` is idempotent and safe to run after every check-out and every
 * correction: it creates the row, moves it to new times, switches it between
 * approved and pending as the minutes cross the 60 mark, and removes it when
 * it no longer applies. It never touches one a person has decided on, never
 * undoes a rejection (including the person declining it), and never suggests
 * over overtime the person filed.
 */
@Injectable()
export class OvertimeSuggestionService {
  constructor(
    private readonly em: EntityManager,
    private readonly modes: AttendanceModeService,
    private readonly employees: EmployeeService,
    private readonly holidays: HolidayService,
    private readonly notifications: AttendanceNotificationService,
  ) {}

  /** The automatic overtime of a day that is still on, for the person's screen. */
  async on(
    profileId: number,
    date: string,
  ): Promise<OvertimeSuggestion | null> {
    const row = await this.em.findOne(AttendanceRequestEntity, {
      employee: profileId,
      type: RequestType.OVERTIME,
      autoSuggested: true,
      status: { $in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
      date,
    });
    return row ? this.view(row) : null;
  }

  private view(row: AttendanceRequestEntity): OvertimeSuggestion {
    return {
      id: row.id,
      minutes: row.durationMinutes ?? 0,
      timeFrom: row.timeFrom!,
      timeTo: row.timeTo!,
      status:
        row.status === RequestStatus.APPROVED
          ? RequestStatus.APPROVED
          : RequestStatus.PENDING,
    };
  }

  /** How much overtime this day warrants, and from when; null for none. */
  private async wanted(
    profile: EmployeeProfileEntity,
    date: string,
    att: AttendanceEntity | null,
  ): Promise<{ from: string; to: string; minutes: number } | null> {
    if (!att?.checkInAt || !att.checkOutAt) return null;
    if ((await this.modes.on(profile.id, date)) !== AttendanceMode.TRACKED) {
      return null;
    }
    if (await this.holidays.isHoliday(date)) return null;

    const assignments =
      (await this.employees.assignmentsFor([profile.id])).get(profile.id) ?? [];
    const schedule = scheduleFor(assignments, date);
    if (!schedule.end) return null;

    // A day already given to leave or a mission isn't a day of overtime.
    const away = await this.em.find(AttendanceRequestEntity, {
      employee: profile.id,
      status: RequestStatus.APPROVED,
      dateFrom: { $lte: date },
      $or: [{ dateTo: null }, { dateTo: { $gte: date } }],
    });
    if (
      away.some(
        (r) =>
          !isHourly(r.type) &&
          [RequestCategory.LEAVE, RequestCategory.MISSION].includes(
            categoryOf(r.type),
          ),
      )
    ) {
      return null;
    }

    let minutes = minutesBetween(schedule.end, att.checkOutAt);
    if (minutes < AUTO_OVERTIME_MIN_MINUTES) return null;

    // Overtime is a time on one civil day; a check-out after midnight stops
    // at its end.
    const shiftEnd = clockToMinutes(tehranClock(schedule.end)!);
    const dayEnd = 23 * 60 + 59;
    minutes = Math.min(minutes, dayEnd - shiftEnd);

    // The shift's own daily cap, when it has one.
    const shift = shiftOn(assignments, date);
    if (shift?.dailyOvertimeCapMinutes) {
      minutes = Math.min(minutes, shift.dailyOvertimeCapMinutes);
    }
    if (minutes < AUTO_OVERTIME_MIN_MINUTES) return null;

    return { from: clock(shiftEnd), to: clock(shiftEnd + minutes), minutes };
  }

  async sync(
    profile: EmployeeProfileEntity,
    date: string,
  ): Promise<OvertimeSuggestion | null> {
    const att = await this.em.findOne(AttendanceEntity, {
      employee: profile.id,
      date,
    });
    const want = await this.wanted(profile, date, att);

    const sameDay = await this.em.find(AttendanceRequestEntity, {
      employee: profile.id,
      type: RequestType.OVERTIME,
      date,
    });
    const existing = sameDay.find((r) => r.autoSuggested) ?? null;
    const filed = sameDay.some(
      (r) =>
        !r.autoSuggested &&
        [RequestStatus.PENDING, RequestStatus.APPROVED].includes(r.status),
    );

    // The system's own row — pending, or approved by the system — can be
    // withdrawn; anything a person decided on stays.
    const withdrawable =
      existing &&
      (existing.status === RequestStatus.PENDING || autoApproved(existing));

    // Overtime the person filed themselves has nothing to add to.
    if (filed || !want) {
      if (withdrawable) await this.em.removeAndFlush(existing);
      return null;
    }

    // Rejected (by the approver, or by the person declining it), or approved
    // by a person: decided, leave it be.
    if (existing && !withdrawable) {
      return existing.status === RequestStatus.APPROVED
        ? this.view(existing)
        : null;
    }

    const approve = want.minutes <= AUTO_OVERTIME_AUTO_APPROVE_MAX_MINUTES;
    const target = approve ? RequestStatus.APPROVED : RequestStatus.PENDING;

    if (existing) {
      const wasPending = existing.status === RequestStatus.PENDING;
      existing.timeFrom = want.from;
      existing.timeTo = want.to;
      existing.durationMinutes = want.minutes;
      existing.status = target;
      existing.reviewedAt = approve ? new Date() : null;
      existing.reviewNote = approve ? AUTO_APPROVED_NOTE : null;
      await this.em.flush();
      // Crossing into "needs approval" is news to the approver.
      if (!approve && !wasPending) {
        await this.notifications.requestSubmitted(existing, profile);
      }
      return this.view(existing);
    }

    const created = this.em.create(AttendanceRequestEntity, {
      employee: profile,
      type: RequestType.OVERTIME,
      date,
      timeFrom: want.from,
      timeTo: want.to,
      durationMinutes: want.minutes,
      status: target,
      autoSuggested: true,
      ...(approve
        ? { reviewedAt: new Date(), reviewNote: AUTO_APPROVED_NOTE }
        : {}),
      description: `${
        approve ? 'ثبت' : 'پیشنهاد'
      } خودکار: خروج ساعت ${tehranClock(att!.checkOutAt)}، پس از پایان شیفت`,
    });
    await this.em.persistAndFlush(created);
    if (!approve) await this.notifications.requestSubmitted(created, profile);
    return this.view(created);
  }
}
