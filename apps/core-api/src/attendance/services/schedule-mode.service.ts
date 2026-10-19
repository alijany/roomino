import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserEntity } from '../../user/user.entity';
import { SCHEDULE_MODE_MESSAGE } from '../attendance.constants';
import { UpdateScheduleModeDto } from '../dtos/setup.dto';
import { ScheduleModePeriodEntity } from '../entities/schedule-mode-period.entity';
import { addDays, tehranToday } from '../utils/attendance-time.util';

/** Serialises switching, so two admins at once can't open two periods. */
const SWITCH_LOCK = 0x5ced_0001;

/** Does a period cover a civil date? */
export const covers = (period: ScheduleModePeriodEntity, date: string) =>
  period.startDate <= date && (!period.endDate || period.endDate >= date);

/**
 * Schedule mode — see `ScheduleModePeriodEntity`.
 *
 * Switching on covers today at once. Switching off takes effect tomorrow:
 * nobody checked in this morning, so today stays by schedule. Switched off
 * on the day it was switched on, the period is dropped — a mistake undone.
 */
@Injectable()
export class ScheduleModeService {
  constructor(private readonly em: EntityManager) {}

  /** Periods overlapping `from`..`to`, for the reports. */
  between(from: string, to: string, em: EntityManager = this.em) {
    return em.find(ScheduleModePeriodEntity, {
      startDate: { $lte: to },
      $or: [{ endDate: null }, { endDate: { $gte: from } }],
    });
  }

  /** The period covering a day, if any. */
  async on(date: string = tehranToday()) {
    const [period] = await this.between(date, date);
    return period ?? null;
  }

  /** The open period — the mode as the admin switch shows it. */
  open(em: EntityManager = this.em) {
    return em.findOne(
      ScheduleModePeriodEntity,
      { endDate: null },
      { populate: ['startedBy'] },
    );
  }

  history(limit = 10) {
    return this.em.find(
      ScheduleModePeriodEntity,
      {},
      {
        orderBy: { startDate: QueryOrder.DESC, id: QueryOrder.DESC },
        limit,
        populate: ['startedBy', 'endedBy'],
      },
    );
  }

  /** Refuses direct check-in/out on a day schedule mode covers. */
  async assertDirectAllowed() {
    if (await this.on()) throw new ForbiddenException(SCHEDULE_MODE_MESSAGE);
  }

  async update(dto: UpdateScheduleModeDto, by: UserEntity) {
    const today = tehranToday();
    const note = dto.note === undefined ? undefined : dto.note.trim() || null;

    await this.em.transactional(async (em) => {
      await em.execute('select pg_advisory_xact_lock(?)', [SWITCH_LOCK]);
      const open = await this.open(em);

      if (dto.enabled) {
        if (open) {
          if (note !== undefined) open.note = note;
          return;
        }
        // Switched back on before the last period ran out: carry it on
        // rather than start an overlapping one.
        const recent = await em.findOne(
          ScheduleModePeriodEntity,
          { endDate: { $gte: addDays(today, -1) } },
          { orderBy: { endDate: QueryOrder.DESC } },
        );
        if (recent) {
          em.assign(recent, {
            endDate: null,
            endedBy: null,
            startedBy: by,
            ...(note !== undefined && { note }),
          });
          return;
        }
        em.create(ScheduleModePeriodEntity, {
          startDate: today,
          note: note ?? null,
          startedBy: by,
        });
        return;
      }

      if (!open) return;
      if (note !== undefined) open.note = note;
      if (open.startDate >= today) {
        em.remove(open);
      } else {
        open.endDate = today;
        open.endedBy = by;
      }
    });
    this.em.clear();
  }
}
