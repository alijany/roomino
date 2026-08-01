import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { CreateRecurringDto } from '../dtos/create-recurring.dto';
import { MeetingRoomEntity } from '../entities/meeting-room.entity';
import { RecurringReservationEntity } from '../entities/recurring-reservation.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import {
  minutesOfDayTehran,
  toJalaliWeekday,
} from '../utils/meeting-time.util';

@Injectable()
export class RecurringReservationService extends BaseRepositoryService<RecurringReservationEntity> {
  constructor(
    @InjectRepository(RecurringReservationEntity)
    protected repository: EntityRepository<RecurringReservationEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: EntityRepository<ReservationEntity>,
  ) {
    super(repository);
  }

  listPaginated(page = 0, limit = 50) {
    return this.findAll(
      {},
      {
        orderBy: { weekday: 'ASC', startMinutes: 'ASC' },
        limit,
        offset: page * limit,
        populate: ['room'] as never,
      },
    );
  }

  /**
   * Ensure a recurring lock does not overlap other locks on the same
   * room/weekday, nor any future one-off reservation that lands on that weekday.
   */
  async assertNoConflict(
    roomId: number,
    weekday: number,
    startMinutes: number,
    endMinutes: number,
    excludeId?: number,
  ): Promise<void> {
    if (startMinutes >= endMinutes) {
      throw new BadRequestException('بازه انتخابی نامعتبر است');
    }

    // (a) Other active recurring locks on the same room & weekday.
    const lockConflict = await this.findOne({
      room: roomId,
      weekday,
      active: true,
      startMinutes: { $lt: endMinutes },
      endMinutes: { $gt: startMinutes },
      ...(excludeId ? { id: { $ne: excludeId } } : {}),
    });
    if (lockConflict) {
      throw new BadRequestException('این بازه با رزرو یا قفل دیگری تداخل دارد');
    }

    // (b) Future one-off reservations for the room that fall on this weekday.
    const futureReservations = await this.reservationRepository.find({
      room: roomId,
      endAt: { $gte: new Date() },
    });
    const hasReservationConflict = futureReservations.some((r) => {
      if (toJalaliWeekday(r.startAt) !== weekday) return false;
      const sM = minutesOfDayTehran(r.startAt);
      const eM = minutesOfDayTehran(r.endAt);
      return sM < endMinutes && eM > startMinutes;
    });
    if (hasReservationConflict) {
      throw new BadRequestException('این بازه با رزرو یا قفل دیگری تداخل دارد');
    }
  }

  async createChecked(
    dto: CreateRecurringDto,
  ): Promise<RecurringReservationEntity[]> {
    const weekdays = [...new Set(dto.weekdays)];

    // Validate every requested weekday before creating any row.
    for (const weekday of weekdays) {
      await this.assertNoConflict(
        dto.roomId,
        weekday,
        dto.startMinutes,
        dto.endMinutes,
      );
    }

    const created: RecurringReservationEntity[] = [];
    for (const weekday of weekdays) {
      created.push(
        await this.create({
          room: this.em.getReference(MeetingRoomEntity, dto.roomId),
          weekday,
          startMinutes: dto.startMinutes,
          endMinutes: dto.endMinutes,
          title: dto.title,
        }),
      );
    }
    return created;
  }
}
