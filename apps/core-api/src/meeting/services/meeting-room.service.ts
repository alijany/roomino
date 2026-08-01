import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { MeetingRoomEntity } from '../entities/meeting-room.entity';
import { RecurringReservationEntity } from '../entities/recurring-reservation.entity';
import { ReservationEntity } from '../entities/reservation.entity';

@Injectable()
export class MeetingRoomService extends BaseRepositoryService<MeetingRoomEntity> {
  constructor(
    @InjectRepository(MeetingRoomEntity)
    protected repository: EntityRepository<MeetingRoomEntity>,
  ) {
    super(repository);
  }

  listPaginated(page = 0, limit = 10, onlyActive = false) {
    return this.findAll(onlyActive ? { active: true } : {}, {
      orderBy: { created_at: 'DESC' },
      limit,
      offset: page * limit,
    });
  }

  /**
   * Delete a room together with its reservations and recurring locks.
   * Dependents are removed first (in one transaction) so the room's foreign
   * keys don't block the delete.
   */
  async deleteWithDependents(id: number): Promise<void> {
    await this.withTransaction(async (em) => {
      await em.nativeDelete(ReservationEntity, { room: id });
      await em.nativeDelete(RecurringReservationEntity, { room: id });
      await em.nativeDelete(MeetingRoomEntity, { id });
    });
  }
}
