import { EntityManager } from '@mikro-orm/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  BoardStatus,
  DayStatus,
  RequestCategory,
  RequestStatus,
  RequestType,
  WorkMode,
} from '../attendance.constants';
import { PeriodQueryDto } from '../dtos/common.dto';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { EmployeeShiftEntity } from '../entities/employee-shift.entity';
import { HolidayEntity } from '../entities/holiday.entity';
import { categoryOf, isHourly } from '../utils/attendance-request.util';
import { isFixedRemoteDay, scheduleFor } from '../utils/attendance-shift.util';
import {
  currentJalali,
  daysInclusive,
  eachDate,
  formatJalaliDate,
  jalaliMonthLabel,
  jalaliMonthRange,
  jalaliWeekdayName,
  minutesBetween,
  tehranClock,
  tehranToday,
} from '../utils/attendance-time.util';
import {
  toAttendanceView,
  toRequestView,
  toWorkplacePin,
} from '../utils/attendance-view.util';
import { EmployeeService } from './employee.service';
import { HolidayService } from './holiday.service';
import { RequestService } from './request.service';

/** Longest custom range a report may cover. */
const MAX_RANGE_DAYS = 370;

export interface Period {
  from: string;
  to: string;
  label: string;
  /** Set when the period is a Jalali month. */
  year?: number;
  month?: number;
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
  workMode: WorkMode | null;
  fixedRemote: boolean;
  hasPending: boolean;
  /** Incomplete or absent with nothing pending — a correction makes sense. */
  needsFix: boolean;
  fixDirection: 'in' | 'out';
  attendance: ReturnType<typeof toAttendanceView> | null;
  requests: ReturnType<typeof toRequestView>[];
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

interface ReportInput {
  attendances: Map<string, AttendanceEntity>;
  requests: AttendanceRequestEntity[];
  holidays: Map<string, HolidayEntity>;
  assignments: EmployeeShiftEntity[];
}

const sum = <T>(items: T[], pick: (item: T) => number) =>
  items.reduce((total, item) => total + pick(item), 0);

/**
 * Day-by-day attendance of a person over a Jalali month or any range: shift,
 * check-in/out, delay, early leave, overtime, leave, remote work — and a
 * summary of the whole period.
 */
@Injectable()
export class ReportService {
  constructor(
    private readonly em: EntityManager,
    private readonly employees: EmployeeService,
    private readonly holidays: HolidayService,
    private readonly requests: RequestService,
  ) {}

  // --- period -----------------------------------------------------------------------

  periodOf(query: PeriodQueryDto): Period {
    if (query.from && query.to) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(query.from) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(query.to)
      ) {
        throw new BadRequestException('بازه تاریخ نامعتبر است');
      }
      if (query.to < query.from) {
        throw new BadRequestException(
          'تاریخ پایان باید بعد از تاریخ شروع باشد',
        );
      }
      if (daysInclusive(query.from, query.to) > MAX_RANGE_DAYS) {
        throw new BadRequestException('بازه گزارش حداکثر یک سال است');
      }
      return {
        from: query.from,
        to: query.to,
        label: `${formatJalaliDate(query.from)} تا ${formatJalaliDate(
          query.to,
        )}`,
      };
    }

    const now = currentJalali();
    const year = query.y ?? now.year;
    const month = query.m ?? now.month;
    const { from, to } = jalaliMonthRange(year, month);
    return { from, to, year, month, label: jalaliMonthLabel(year, month) };
  }

  // --- loading -------------------------------------------------------------------------

  /** Everything a report over `profiles` needs, in a handful of queries. */
  private async load(
    profiles: EmployeeProfileEntity[],
    from: string,
    to: string,
  ) {
    const ids = profiles.map((p) => p.id);

    const [attendanceRows, requests, holidays, assignments] = await Promise.all(
      [
        ids.length
          ? this.em.find(
              AttendanceEntity,
              { employee: { $in: ids }, date: { $gte: from, $lte: to } },
              { populate: ['editedBy', 'workplace'] },
            )
          : Promise.resolve([] as AttendanceEntity[]),
        this.requests.inRange(ids, from, to, [
          RequestStatus.APPROVED,
          RequestStatus.PENDING,
        ]),
        this.holidays.between(from, to),
        this.employees.assignmentsFor(ids),
      ],
    );

    return (profileId: number): ReportInput => ({
      attendances: new Map(
        attendanceRows
          .filter((a) => a.employee.id === profileId)
          .map((a) => [a.date, a]),
      ),
      requests: requests.filter((r) => r.employee.id === profileId),
      holidays,
      assignments: assignments.get(profileId) ?? [],
    });
  }

  async report(profile: EmployeeProfileEntity, period: Period) {
    const input = (await this.load([profile], period.from, period.to))(
      profile.id,
    );
    return {
      ...this.build(profile, period, input),
      // The day map falls back to this when a day's row has no workplace.
      workplace: profile.workplace ? toWorkplacePin(profile.workplace) : null,
    };
  }

  /** Summaries for many people over one period (performance list, export). */
  async summaries(profiles: EmployeeProfileEntity[], period: Period) {
    const inputFor = await this.load(profiles, period.from, period.to);
    return profiles.map((profile) => ({
      profile,
      summary: this.build(profile, period, inputFor(profile.id)).summary,
    }));
  }

  private build(
    profile: EmployeeProfileEntity,
    period: Period,
    input: ReportInput,
  ) {
    const today = tehranToday();
    const now = new Date();
    const days = eachDate(period.from, period.to).map((date) =>
      this.buildDay(profile, date, input, today, now),
    );
    return { period, days, summary: this.summarize(days, today) };
  }

  // --- one day ---------------------------------------------------------------------------

  private buildDay(
    profile: EmployeeProfileEntity,
    date: string,
    input: ReportInput,
    today: string,
    now: Date,
  ): ReportDay {
    const holiday = input.holidays.get(date) ?? null;
    const att = input.attendances.get(date) ?? null;
    // Official or registered holidays have no scheduled work.
    const schedule = holiday
      ? { start: null, end: null, scheduled: 0 }
      : scheduleFor(input.assignments, date);
    const { start: shiftStart, end: shiftEnd, scheduled } = schedule;

    const onDay = input.requests.filter((r) =>
      r.dateFrom
        ? r.dateFrom <= date && (r.dateTo ?? r.dateFrom) >= date
        : r.date === date,
    );
    const approved = onDay.filter((r) => r.status === RequestStatus.APPROVED);
    const pending = onDay.filter((r) => r.status === RequestStatus.PENDING);

    const fullDayLeave = approved.some(
      (r) => categoryOf(r.type) === RequestCategory.LEAVE && !isHourly(r.type),
    );
    const fullDayMission = approved.some(
      (r) => r.type === RequestType.MISSION_DAILY,
    );
    const fullDayRemote = approved.some(
      (r) => r.type === RequestType.REMOTE_DAILY,
    );
    const remoteHourly = sum(
      approved.filter((r) => r.type === RequestType.REMOTE_HOURLY),
      (r) => r.durationMinutes ?? 0,
    );

    // Remote work: a fixed weekly day or an approved request earns the full
    // scheduled shift. An unpermitted remote check-in stays pending until
    // approved, and counts as absence if rejected.
    const remoteCheckIn =
      att?.workMode === WorkMode.REMOTE && Boolean(att.checkInAt);
    const fixedRemote = scheduled > 0 && isFixedRemoteDay(profile, date);
    const pendingRemote = pending.some(
      (r) => r.type === RequestType.REMOTE_DAILY,
    );
    const creditRemote = fullDayRemote || (fixedRemote && remoteCheckIn);

    const checkIn = att?.checkInAt ?? null;
    const checkOut = att?.checkOutAt ?? null;
    const isToday = date === today;
    const isFuture = date > today;

    let worked = 0;
    if (checkIn && (checkOut || isToday)) {
      worked = Math.max(0, minutesBetween(checkIn, checkOut ?? now));
    }

    let delay = 0;
    let early = 0;
    if (shiftStart && checkIn && checkIn > shiftStart) {
      delay = minutesBetween(shiftStart, checkIn);
    }
    if (shiftEnd && checkOut && checkOut < shiftEnd) {
      early = minutesBetween(checkOut, shiftEnd);
    }

    let status: DayStatus;
    if (fullDayLeave || att?.status === AttendanceStatus.ON_LEAVE)
      status = DayStatus.ON_LEAVE;
    else if (fullDayMission) status = DayStatus.MISSION;
    else if (creditRemote) status = DayStatus.REMOTE;
    else if (remoteCheckIn && pendingRemote) status = DayStatus.REMOTE_PENDING;
    else if (remoteCheckIn)
      status = DayStatus.ABSENT; // remote request rejected
    else if (checkIn && checkOut) status = DayStatus.PRESENT;
    else if (checkIn && isToday) status = DayStatus.IN_PROGRESS;
    else if (checkIn || checkOut) status = DayStatus.INCOMPLETE;
    else if (isFuture || isToday)
      status = scheduled > 0 ? DayStatus.FUTURE : DayStatus.HOLIDAY;
    else if (scheduled === 0) status = DayStatus.HOLIDAY;
    else if (remoteHourly > 0) status = DayStatus.REMOTE;
    else status = DayStatus.ABSENT;

    const rejectedRemote = status === DayStatus.ABSENT && remoteCheckIn;

    // Days without required presence carry no delay or early leave.
    if (
      [
        DayStatus.ON_LEAVE,
        DayStatus.MISSION,
        DayStatus.REMOTE_PENDING,
      ].includes(status) ||
      rejectedRemote
    ) {
      delay = early = 0;
    }
    if (status === DayStatus.REMOTE_PENDING || rejectedRemote) worked = 0;

    // Approved remote work counts as worked time: a daily one for the whole
    // scheduled shift (replacing recorded hours), an hourly one for its
    // duration — covering early leave first, then delay.
    let remote = 0;
    if (status === DayStatus.REMOTE && creditRemote) {
      remote = scheduled;
      delay = early = 0;
      worked = 0;
    } else if (remoteHourly > 0) {
      remote = remoteHourly;
      const covered = Math.min(early, remote);
      early -= covered;
      delay = Math.max(0, delay - (remote - covered));
    }
    // Planned remote work on future days isn't worked time yet.
    if (isFuture) remote = 0;
    worked += remote;

    const overtime = sum(
      approved.filter((r) => r.type === RequestType.OVERTIME),
      (r) => r.durationMinutes ?? 0,
    );
    const leaveMinutes = sum(
      approved.filter((r) => categoryOf(r.type) === RequestCategory.LEAVE),
      (r) => (isHourly(r.type) ? r.durationMinutes ?? 0 : scheduled),
    );

    return {
      date,
      jalali: formatJalaliDate(date),
      weekday: jalaliWeekdayName(date),
      isToday,
      isFuture,
      holiday: holiday?.title ?? null,
      shiftStart: tehranClock(shiftStart),
      shiftEnd: tehranClock(shiftEnd),
      scheduled,
      checkIn: tehranClock(checkIn),
      checkOut: tehranClock(checkOut),
      worked,
      delay,
      early,
      remote,
      overtime,
      leaveMinutes,
      status,
      workMode: att?.workMode ?? null,
      fixedRemote,
      hasPending: pending.length > 0,
      needsFix:
        [DayStatus.INCOMPLETE, DayStatus.ABSENT].includes(status) &&
        pending.length === 0,
      fixDirection: checkIn && !checkOut ? 'out' : 'in',
      attendance: att ? toAttendanceView(att) : null,
      requests: onDay.map(toRequestView),
    };
  }

  private summarize(days: ReportDay[], today: string): ReportSummary {
    // Today only counts once the day is finished with a check-out.
    const past = days.filter(
      (d) =>
        d.date < today ||
        (d.isToday && [DayStatus.PRESENT, DayStatus.REMOTE].includes(d.status)),
    );
    // Scheduled time up to today, without full-day leave or mission days.
    const required = sum(
      past.filter(
        (d) => ![DayStatus.ON_LEAVE, DayStatus.MISSION].includes(d.status),
      ),
      (d) => d.scheduled,
    );
    const worked = sum(days, (d) => d.worked);
    const absent = days.filter((d) => d.status === DayStatus.ABSENT);

    return {
      worked,
      required,
      requiredPeriod: sum(days, (d) => d.scheduled),
      balance: worked - required,
      delayCount: days.filter((d) => d.delay > 0).length,
      delayMinutes: sum(days, (d) => d.delay),
      earlyCount: days.filter((d) => d.early > 0).length,
      earlyMinutes: sum(days, (d) => d.early),
      overtime: sum(days, (d) => d.overtime),
      leaveMinutes: sum(days, (d) => d.leaveMinutes),
      absentDays: absent.length,
      absentMinutes: sum(absent, (d) => d.scheduled),
      incompleteDays: days.filter((d) => d.status === DayStatus.INCOMPLETE)
        .length,
      leaveDays: days.filter((d) => d.status === DayStatus.ON_LEAVE).length,
      missionDays: days.filter((d) => d.status === DayStatus.MISSION).length,
      remoteDays: days.filter(
        (d) => d.status === DayStatus.REMOTE && d.remote > 0,
      ).length,
      remotePendingDays: days.filter(
        (d) => d.status === DayStatus.REMOTE_PENDING,
      ).length,
      remoteMinutes: sum(days, (d) => d.remote),
      presentDays: days.filter((d) =>
        [DayStatus.PRESENT, DayStatus.IN_PROGRESS].includes(d.status),
      ).length,
    };
  }

  // --- live board -------------------------------------------------------------------------

  /** Today's status of each person — admin dashboard and "my team". */
  async board(profiles: EmployeeProfileEntity[]) {
    const today = tehranToday();
    const now = new Date();
    const ids = profiles.map((p) => p.id);

    const [attendances, holiday, assignments] = await Promise.all([
      ids.length
        ? this.em.find(AttendanceEntity, {
            employee: { $in: ids },
            date: today,
          })
        : Promise.resolve([] as AttendanceEntity[]),
      this.holidays.isHoliday(today),
      this.employees.assignmentsFor(ids),
    ]);
    const byProfile = new Map(attendances.map((a) => [a.employee.id, a]));

    const rows = profiles.map((profile) => {
      const att = byProfile.get(profile.id) ?? null;
      const { start } = holiday
        ? { start: null }
        : scheduleFor(assignments.get(profile.id) ?? [], today);

      let status: BoardStatus;
      if (att?.status === AttendanceStatus.ON_LEAVE)
        status = BoardStatus.ON_LEAVE;
      else if (att?.checkInAt && att.workMode === WorkMode.REMOTE) {
        status = att.checkOutAt ? BoardStatus.REMOTE_DONE : BoardStatus.REMOTE;
      } else if (att?.checkOutAt) status = BoardStatus.DONE;
      else if (att?.checkInAt) status = BoardStatus.WORKING;
      else if (!start) status = BoardStatus.OFF;
      else if (now < start) status = BoardStatus.NOT_YET;
      else status = BoardStatus.MISSING;

      return {
        profile,
        status,
        shiftStart: tehranClock(start),
        checkIn: tehranClock(att?.checkInAt),
        checkOut: tehranClock(att?.checkOutAt),
        checkInDistanceM: att?.checkInDistanceM ?? null,
      };
    });

    const present = [
      BoardStatus.WORKING,
      BoardStatus.DONE,
      BoardStatus.REMOTE,
      BoardStatus.REMOTE_DONE,
    ];

    return {
      date: today,
      jalali: formatJalaliDate(today),
      holiday: holiday?.title ?? null,
      rows,
      stats: {
        employees: rows.length,
        present: rows.filter((r) => present.includes(r.status)).length,
        missing: rows.filter((r) => r.status === BoardStatus.MISSING).length,
        onLeave: rows.filter((r) => r.status === BoardStatus.ON_LEAVE).length,
      },
    };
  }
}
