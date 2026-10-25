import {
  EntityManager,
  UniqueConstraintViolationException,
} from '@mikro-orm/core';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UserEntity } from '../../user/user.entity';
import {
  AttendanceMode,
  AttendanceStatus,
  MAX_CONFIRM_DAYS,
  RequestCategory,
  RequestStatus,
} from '../attendance.constants';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { PresenceDeclarationEntity } from '../entities/presence-declaration.entity';
import { categoryOf, isHourly } from '../utils/attendance-request.util';
import { scheduleFor } from '../utils/attendance-shift.util';
import { formatJalaliDate, tehranToday } from '../utils/attendance-time.util';
import { AttendanceModeService } from './attendance-mode.service';
import { EmployeeService } from './employee.service';
import { HolidayService } from './holiday.service';

type WhyNot = 'future' | 'tracked' | 'off_day' | 'marked_absent' | 'away';

/**
 * Presence of people in «بدون ثبت».
 *
 * They record no times. A scheduled day counts as present only if they said
 * so — «امروز هستم», on the day — or a reviewer later confirmed it
 * («حاضر بود»), which is how forgotten days are put right at the month's
 * end. A past scheduled day with neither, and no leave or mission, is absent
 * (see `ReportService`).
 */
@Injectable()
export class PresenceService {
  constructor(
    private readonly em: EntityManager,
    private readonly modes: AttendanceModeService,
    private readonly employees: EmployeeService,
    private readonly holidays: HolidayService,
  ) {}

  /** The declaration on a day, if any. */
  on(profileId: number, date: string = tehranToday()) {
    return this.em.findOne(PresenceDeclarationEntity, {
      employee: profileId,
      date,
    });
  }

  /** Dates in a range that count as declared, keyed by profile id. */
  async datesBetween(
    profileIds: number[],
    from: string,
    to: string,
  ): Promise<Map<number, Set<string>>> {
    const map = new Map<number, Set<string>>();
    if (!profileIds.length) return map;
    const rows = await this.em.find(PresenceDeclarationEntity, {
      employee: { $in: profileIds },
      date: { $gte: from, $lte: to },
    });
    for (const row of rows) {
      const dates = map.get(row.employee.id) ?? new Set<string>();
      dates.add(row.date);
      map.set(row.employee.id, dates);
    }
    return map;
  }

  /**
   * Why a day can't be declared present, or null if it can: in the future,
   * not «بدون ثبت» that day, not a working day, or already given to leave or
   * a mission.
   */
  private async whyNot(
    profile: EmployeeProfileEntity,
    date: string,
    today: string,
  ): Promise<{ code: WhyNot; text: string } | null> {
    if (date > today) {
      return { code: 'future', text: 'روز آینده را نمی‌توان اعلام کرد' };
    }

    if ((await this.modes.on(profile.id, date)) !== AttendanceMode.UNTRACKED) {
      return {
        code: 'tracked',
        text: 'در این روز ثبت ورود و خروج داشته است؛ اعلام حضور لازم نیست',
      };
    }

    const [assignments, holiday] = await Promise.all([
      this.employees.assignmentsFor([profile.id]),
      this.holidays.isHoliday(date),
    ]);
    const scheduled = holiday
      ? 0
      : scheduleFor(assignments.get(profile.id) ?? [], date).scheduled;
    if (scheduled === 0) {
      return { code: 'off_day', text: 'این روز، روز کاری نیست' };
    }

    const day = await this.em.findOne(AttendanceEntity, {
      employee: profile.id,
      date,
    });
    if (day?.status === AttendanceStatus.ABSENT) {
      return {
        code: 'marked_absent',
        text: 'این روز را مدیر «غایب» ثبت کرده است؛ از «اصلاح تردد» تغییر دهید',
      };
    }

    const away = await this.em.find(AttendanceRequestEntity, {
      employee: profile.id,
      status: RequestStatus.APPROVED,
      dateFrom: { $lte: date },
      $or: [{ dateTo: null }, { dateTo: { $gte: date } }],
    });
    const fullDay = away.some(
      (r) =>
        !isHourly(r.type) &&
        [RequestCategory.LEAVE, RequestCategory.MISSION].includes(
          categoryOf(r.type),
        ),
    );
    return fullDay
      ? { code: 'away', text: 'در این روز مرخصی یا ماموریت تاییدشده دارد' }
      : null;
  }

  private async persist(
    profile: EmployeeProfileEntity,
    date: string,
    by?: UserEntity,
    note?: string,
  ) {
    const existing = await this.on(profile.id, date);
    if (existing) return existing;

    try {
      const row = this.em.create(PresenceDeclarationEntity, {
        employee: profile,
        date,
        declaredAt: new Date(),
        declaredBy: by ?? null,
        note: note?.trim() || null,
      });
      await this.em.persistAndFlush(row);
      return row;
    } catch (error) {
      // A double tap: the other request wrote it first.
      if (error instanceof UniqueConstraintViolationException) {
        this.em.clear();
        return (await this.on(profile.id, date))!;
      }
      throw error;
    }
  }

  /** «امروز هستم»: the person declares today. Idempotent. */
  async declare(profile: EmployeeProfileEntity) {
    const today = tehranToday();
    const reason = await this.whyNot(profile, today, today);
    if (reason) {
      const text: Record<WhyNot, string> = {
        future: 'امروز هنوز نرسیده است.',
        tracked:
          'اعلام حضور فقط برای پرسنلِ «بدون ثبت» است؛ شما ورود و خروج را ثبت می‌کنید.',
        off_day: 'امروز روز کاری شما نیست.',
        marked_absent: 'امروز برای شما «غایب» ثبت شده است.',
        away: 'برای امروز مرخصی یا ماموریت تاییدشده دارید؛ حضور اعلام نمی‌شود.',
      };
      throw new BadRequestException(text[reason.code]);
    }
    return this.persist(profile, today);
  }

  /** Take back today's declaration. */
  async withdraw(profile: EmployeeProfileEntity) {
    await this.em.nativeDelete(PresenceDeclarationEntity, {
      employee: profile.id,
      date: tehranToday(),
    });
  }

  /**
   * «حاضر بود»: a reviewer confirms days the person didn't declare — the
   * month-end clean-up. All or nothing: every date is checked first and the
   * problems are reported together.
   */
  async confirm(
    profile: EmployeeProfileEntity,
    dates: string[],
    by: UserEntity,
    note?: string,
  ) {
    const unique = [...new Set(dates)].sort();
    if (!unique.length) throw new BadRequestException('روزی انتخاب نشده است');
    if (unique.length > MAX_CONFIRM_DAYS) {
      throw new BadRequestException(
        `در هر بار حداکثر ${MAX_CONFIRM_DAYS} روز را می‌توان تایید کرد`,
      );
    }
    if (profile.user.id === by.id) {
      throw new BadRequestException('حضور خودتان را نمی‌توانید تایید کنید');
    }

    const today = tehranToday();
    const problems: string[] = [];
    for (const date of unique) {
      const reason = await this.whyNot(profile, date, today);
      if (reason) problems.push(`${formatJalaliDate(date)}: ${reason.text}`);
    }
    if (problems.length) {
      throw new ConflictException(problems.join('؛ '));
    }

    for (const date of unique) {
      await this.persist(profile, date, by, note);
    }
    return { confirmed: unique.length };
  }

  /** A reviewer takes back a confirmation (or a declaration) of a day. */
  async revoke(profile: EmployeeProfileEntity, date: string) {
    await this.em.nativeDelete(PresenceDeclarationEntity, {
      employee: profile.id,
      date,
    });
  }
}
