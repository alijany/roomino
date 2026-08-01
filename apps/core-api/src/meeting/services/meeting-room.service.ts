import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { MeetingRoomEntity } from '../entities/meeting-room.entity';

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
}
