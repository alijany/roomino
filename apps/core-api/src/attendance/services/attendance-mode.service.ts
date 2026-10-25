import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { AttendanceMode, UNTRACKED_MESSAGE } from '../attendance.constants';
import { EmployeeModePeriodEntity } from '../entities/employee-mode-period.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { modeOn, resolveMode } from '../utils/attendance-mode.util';
import { addDays, tehranToday } from '../utils/attendance-time.util';

/**
 * Who checks in how — the history behind `AttendanceMode`.
 *
 * A person's mode is their own override, else their job group's. Whenever
 * either changes, `sync` writes the result to `EmployeeModePeriodEntity` so
 * past days keep the mode they were lived in. The reports read the history,
 * never the live settings.
 *
 * Starting «بدون ثبت» covers today at once. Leaving it takes effect
 * tomorrow — nobody checked in this morning, so today stays by schedule —
 * unless it only started today, which is a mistake undone.
 */
@Injectable()
export class AttendanceModeService {
  constructor(private readonly em: EntityManager) {}

  /** Periods of several people, newest first, keyed by profile id. */
  async periodsFor(
    profileIds: number[],
    em: EntityManager = this.em,
  ): Promise<Map<number, EmployeeModePeriodEntity[]>> {
    const map = new Map<number, EmployeeModePeriodEntity[]>();
    if (!profileIds.length) return map;

    const rows = await em.find(
      EmployeeModePeriodEntity,
      { employee: { $in: profileIds } },
      { orderBy: { startDate: QueryOrder.DESC, id: QueryOrder.DESC } },
    );
    for (const row of rows) {
      const list = map.get(row.employee.id) ?? [];
      list.push(row);
      map.set(row.employee.id, list);
    }
    return map;
  }

  /** A person's mode on a civil date (today by default). */
  async on(
    profileId: number,
    date: string = tehranToday(),
  ): Promise<AttendanceMode> {
    const periods = (await this.periodsFor([profileId])).get(profileId) ?? [];
    return modeOn(periods, date);
  }

  /** Check-in/out are refused in «بدون ثبت»; the global switch is separate. */
  async assertCanPunch(profile: EmployeeProfileEntity) {
    if ((await this.on(profile.id)) === AttendanceMode.UNTRACKED) {
      throw new ForbiddenException(UNTRACKED_MESSAGE);
    }
  }

  /**
   * Bring the history in line with what each profile's settings now say.
   * Call it after anything that can change the answer: a profile's override
   * or job group, a group's mode, a group's deletion. Idempotent.
   *
   * `from` is when a brand-new profile's mode starts (its first shift day);
   * it has no effect on a profile that already has history.
   */
  async sync(
    profileIds: number[],
    em: EntityManager = this.em,
    from?: string,
  ): Promise<void> {
    if (!profileIds.length) return;

    const [profiles, history] = await Promise.all([
      em.find(
        EmployeeProfileEntity,
        { id: { $in: profileIds } },
        { populate: ['jobGroup'] as never },
      ),
      this.periodsFor(profileIds, em),
    ]);

    const today = tehranToday();
    const tomorrow = addDays(today, 1);

    for (const profile of profiles) {
      let periods = history.get(profile.id) ?? [];
      const desired = resolveMode(profile);

      // A switch scheduled for tomorrow is superseded by this change.
      for (const period of periods.filter((p) => p.startDate > today)) {
        em.remove(period);
      }
      periods = periods.filter((p) => p.startDate <= today);

      // «بدون ثبت» that began today and is already being left: nothing was
      // presumed yet, so drop it rather than carry it to tomorrow.
      const latest = periods[0];
      if (
        latest &&
        latest.startDate === today &&
        latest.mode === AttendanceMode.UNTRACKED &&
        desired !== AttendanceMode.UNTRACKED
      ) {
        em.remove(latest);
        periods = periods.slice(1);
      }

      const current = modeOn(periods, today);
      if (current === desired) continue;

      const startDate =
        current === AttendanceMode.UNTRACKED ? tomorrow : from ?? today;

      // Two changes on one day: the later one replaces the earlier.
      const sameDay = periods.find((p) => p.startDate === startDate);
      if (sameDay) {
        sameDay.mode = desired;
      } else {
        em.persist(
          em.create(EmployeeModePeriodEntity, {
            employee: profile,
            mode: desired,
            startDate,
          }),
        );
      }
    }

    await em.flush();
  }
}
