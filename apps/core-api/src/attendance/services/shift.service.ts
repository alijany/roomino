import { EntityManager, QueryOrder } from '@mikro-orm/core';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WEEKDAY_LABELS } from '../attendance.constants';
import { CreateShiftDto, ShiftDayDto } from '../dtos/setup.dto';
import { EmployeeShiftEntity } from '../entities/employee-shift.entity';
import { ShiftDayEntity } from '../entities/shift-day.entity';
import { ShiftEntity } from '../entities/shift.entity';
import { clockToMinutes } from '../utils/attendance-time.util';

@Injectable()
export class ShiftService {
  constructor(private readonly em: EntityManager) {}

  list() {
    return this.em.find(
      ShiftEntity,
      {},
      { populate: ['days'], orderBy: { name: QueryOrder.ASC } },
    );
  }

  async getOrFail(id: number) {
    const shift = await this.em.findOne(
      ShiftEntity,
      { id },
      { populate: ['days'] },
    );
    if (!shift) throw new NotFoundException('شیفت یافت نشد');
    return shift;
  }

  /** Times must run forward: start < end < second start < second end. */
  private validateDays(days: ShiftDayDto[]) {
    const seen = new Set<number>();

    for (const day of days) {
      const label = WEEKDAY_LABELS[day.dayOfWeek];
      if (seen.has(day.dayOfWeek)) {
        throw new BadRequestException(`روز ${label} تکراری است`);
      }
      seen.add(day.dayOfWeek);

      if (!day.isActive) continue;

      if (clockToMinutes(day.endTime) <= clockToMinutes(day.startTime)) {
        throw new BadRequestException(
          `ساعت پایان ${label} باید بعد از ساعت شروع باشد`,
        );
      }

      if (day.hasSecondPart) {
        if (
          clockToMinutes(day.secondStartTime) <= clockToMinutes(day.endTime)
        ) {
          throw new BadRequestException(
            `شروع قسمت دوم ${label} باید بعد از پایان قسمت اول باشد`,
          );
        }
        if (
          clockToMinutes(day.secondEndTime) <=
          clockToMinutes(day.secondStartTime)
        ) {
          throw new BadRequestException(
            `پایان قسمت دوم ${label} باید بعد از شروع آن باشد`,
          );
        }
      }
    }
  }

  /** All seven weekdays are always stored; missing ones are days off. */
  private applyDays(shift: ShiftEntity, days: ShiftDayDto[]) {
    const byDay = new Map(days.map((d) => [d.dayOfWeek, d]));
    const existing = new Map(
      shift.days.getItems().map((d) => [d.dayOfWeek, d]),
    );

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const input = byDay.get(dayOfWeek);
      const active = Boolean(input?.isActive);
      const second = active && Boolean(input?.hasSecondPart);
      const values = {
        isActive: active,
        startTime: active ? input.startTime : null,
        endTime: active ? input.endTime : null,
        hasSecondPart: second,
        secondStartTime: second ? input.secondStartTime : null,
        secondEndTime: second ? input.secondEndTime : null,
      };

      const day = existing.get(dayOfWeek);
      if (day) {
        this.em.assign(day, values);
      } else {
        shift.days.add(
          this.em.create(ShiftDayEntity, { shift, dayOfWeek, ...values }),
        );
      }
    }
  }

  async create(dto: CreateShiftDto) {
    this.validateDays(dto.days);
    const shift = this.em.create(ShiftEntity, {
      name: dto.name,
      year: dto.year,
      flexMinutes: dto.flexMinutes ?? 0,
      dailyOvertimeCapMinutes: dto.dailyOvertimeCapMinutes,
    });
    this.applyDays(shift, dto.days);
    await this.em.persistAndFlush(shift);
    return shift;
  }

  async update(id: number, dto: CreateShiftDto) {
    this.validateDays(dto.days);
    const shift = await this.getOrFail(id);
    this.em.assign(shift, {
      name: dto.name,
      year: dto.year,
      flexMinutes: dto.flexMinutes ?? 0,
      dailyOvertimeCapMinutes: dto.dailyOvertimeCapMinutes ?? null,
    });
    this.applyDays(shift, dto.days);
    await this.em.flush();
    return shift;
  }

  /** A shift that has ever been assigned is history and stays. */
  async remove(id: number) {
    const shift = await this.getOrFail(id);
    const used = await this.em.count(EmployeeShiftEntity, { shift: id });
    if (used > 0) {
      throw new ConflictException(
        'این شیفت به پرسنل تخصیص داده شده و قابل حذف نیست',
      );
    }
    await this.em.removeAndFlush(shift);
  }
}
